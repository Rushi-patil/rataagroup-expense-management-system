import datetime
import json
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from db import expenses_collection, fs, expense_type_collection
from bson import ObjectId
from fastapi.responses import StreamingResponse

router = APIRouter(
    prefix="/expense",
    tags=["Expenses"]
)

# Helper function to get file details
def get_file_details(file_ids):
    files = []
    for file_id in file_ids:
        try:
            grid_out = fs.get(ObjectId(file_id))
            files.append({"id": str(file_id), "filename": grid_out.filename})
        except:
            # Handle cases where a file ID exists in the array but the file is gone from GridFS
            files.append({"id": str(file_id), "filename": "Unknown File"})
    return files

# ---------------- CREATE EXPENSE ----------------
@router.post("/create")
async def create_expense(
    expenseTypeId: str = Form(...),
    title: str = Form(...),
    date: str = Form(...),
    amount: float = Form(...),
    paymentMode: str = Form(...),
    billAvailable: bool = Form(...),
    userEmail: str = Form(...),
    description: str = Form(""),
    carNumber: str = Form(""),
    serviceType: str = Form(""),
    location: str = Form(""),
    equipmentName: str = Form(""),
    equipmentType: str = Form(""),
    attachments: List[UploadFile] = File([])
):
    if not ObjectId.is_valid(expenseTypeId) or not expense_type_collection.find_one({"_id": ObjectId(expenseTypeId)}):
        raise HTTPException(status_code=400, detail="Invalid expenseTypeId")

    file_ids = []
    for file in attachments:
        content = await file.read()
        file_id = fs.put(content, filename=file.filename, contentType=file.content_type)
        file_ids.append(str(file_id))

    expense_data = {
        "expenseTypeId": expenseTypeId,
        "title": title,
        "date": date,
        "amount": amount,
        "paymentMode": paymentMode,
        "billAvailable": billAvailable,
        "userEmail": userEmail,
        "description": description,
        "carNumber": carNumber,
        "serviceType": serviceType,
        "location": location,
        "equipmentName": equipmentName,
        "equipmentType": equipmentType,
        "attachments": file_ids, # Store just IDs in DB
        "createdAt": datetime.datetime.now(),
        "updatedAt": datetime.datetime.now()
    }

    result = expenses_collection.insert_one(expense_data)
    return {"message": "Expense created successfully", "expense_id": str(result.inserted_id)}

# ---------------- GET ALL EXPENSES ----------------
@router.get("/all")
def get_all_expenses():
    expenses = list(expenses_collection.find())
    for exp in expenses:
        exp["_id"] = str(exp["_id"])
        # Enrich attachment IDs with filenames
        exp["attachments"] = get_file_details(exp.get("attachments", []))
    return expenses

# ---------------- GET EXPENSE BY userId ----------------
@router.get("/user/{user_email}")
def get_expenses_by_user(user_email: str):
    expenses = list(expenses_collection.find({"userEmail": user_email}))
    for exp in expenses:
        exp["_id"] = str(exp["_id"])
        # Enrich attachment IDs with filenames
        exp["attachments"] = get_file_details(exp.get("attachments", []))
    return expenses

# ---------------- UPDATE EXPENSE ----------------
@router.put("/update/{expense_id}")
async def update_expense(
    expense_id: str,
    expenseTypeId: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    date: Optional[str] = Form(None),
    amount: Optional[float] = Form(None),
    paymentMode: Optional[str] = Form(None),
    billAvailable: Optional[bool] = Form(None),
    userEmail: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    carNumber: Optional[str] = Form(None),
    serviceType: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    equipmentName: Optional[str] = Form(None),
    equipmentType: Optional[str] = Form(None),
    # New fields for handling files
    keptAttachments: str = Form("[]"), # JSON string of IDs to keep
    newAttachments: List[UploadFile] = File([]) # New files to add
):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    existing_expense = expenses_collection.find_one({"_id": ObjectId(expense_id)})
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # 1. Prepare basic field updates
    update_data = {}
    fields_to_update = {
        "expenseTypeId": expenseTypeId, "title": title, "date": date,
        "amount": amount, "paymentMode": paymentMode, "billAvailable": billAvailable,
        "userEmail": userEmail, "description": description, "carNumber": carNumber,
        "serviceType": serviceType, "location": location, "equipmentName": equipmentName,
        "equipmentType": equipmentType,
    }
    for field, value in fields_to_update.items():
        if value is not None:
            update_data[field] = value

    # 2. Handle File Deletions
    # Parse the list of attachment IDs the user wants to keep
    try:
        kept_attachment_ids = json.loads(keptAttachments)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid keptAttachments format")

    current_attachment_ids = existing_expense.get("attachments", [])
    
    # Find files that are in the DB but NOT in the 'kept' list. These are removed.
    files_to_delete_ids = [
        fid for fid in current_attachment_ids if fid not in kept_attachment_ids
    ]

    # Delete them from GridFS
    for file_id in files_to_delete_ids:
        try:
            fs.delete(ObjectId(file_id))
        except Exception as e:
            print(f"Error deleting file {file_id}: {e}")

    # 3. Handle New File Uploads
    new_file_ids = []
    for file in newAttachments:
        content = await file.read()
        file_id = fs.put(content, filename=file.filename, contentType=file.content_type)
        new_file_ids.append(str(file_id))

    # 4. Combine kept and new files for the final list
    final_attachment_ids = kept_attachment_ids + new_file_ids
    update_data["attachments"] = final_attachment_ids

    # 5. Perform the update
    if not update_data and not files_to_delete_ids and not new_file_ids:
         # If nothing changed, just return success
         return {"message": "No changes detected"}

    expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data, "$currentDate": {"updatedAt": True}}
    )

    return {"message": "Expense updated successfully"}

# ... (Delete and Download APIs remain the same) ...
# ---------------- DELETE EXPENSE ----------------
@router.delete("/delete/{expense_id}")
def delete_expense(expense_id: str):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    result = expenses_collection.delete_one({"_id": ObjectId(expense_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Expense not found")

    return {"message": "Expense deleted successfully"}

# ---------------- DOWNLOAD ATTACHMENT ----------------
@router.get("/attachment/{file_id}")
def download_attachment(file_id: str):
    try:
        file = fs.get(ObjectId(file_id))
    except:
        raise HTTPException(status_code=404, detail="File not found")

    return StreamingResponse(
        file,
        media_type=file.content_type,
        headers={"Content-Disposition": f"attachment; filename={file.filename}"}
    )

# ---------------- DELETE SPECIFIC ATTACHMENT ----------------
@router.delete("/expense/{expense_id}/attachment/{file_id}")
def remove_attachment(expense_id: str, file_id: str):
    if not ObjectId.is_valid(expense_id) or not ObjectId.is_valid(file_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 1. Remove ID from the expense document's 'attachments' array
    result = expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$pull": {"attachments": file_id}}
    )

    if result.modified_count == 0:
        # If it wasn't in the array, maybe it didn't exist or was already removed
        # We can still try to delete from GridFS to be safe, or raise 404
        pass 

    # 2. Remove the actual file content from GridFS
    try:
        fs.delete(ObjectId(file_id))
    except Exception as e:
        print(f"GridFS delete error: {e}") 
        # We don't raise error here to ensure the UI stays consistent 
        # (if DB ref is gone, file is effectively gone for app)

    return {"message": "Attachment removed successfully"}