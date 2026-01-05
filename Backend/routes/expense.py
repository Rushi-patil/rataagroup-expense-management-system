# Backend/routes/expense.py
import datetime
import json
import asyncio
from typing import List, Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import StreamingResponse
from bson import ObjectId

# Imports from your project structure
from db import expenses_collection, expense_type_collection
from models import ExpenseDeleteRequest

# Import the new utils
from gdrive_utils import (
    upload_file_to_drive, 
    delete_file_from_drive, 
    stream_file_content  # 👈 Using the streaming function
)

router = APIRouter(
    prefix="/expense",
    tags=["Expenses"]
)

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

    # 🟢 1. PARALLEL UPLOAD LOGIC
    # We create a list of upload tasks and run them all at once using asyncio.gather
    upload_tasks = []
    for file in attachments:
        upload_tasks.append(upload_file_to_drive(file))
    
    uploaded_files_metadata = []
    if upload_tasks:
        try:
            # Wait for all uploads to finish in parallel
            results = await asyncio.gather(*upload_tasks)
            # Filter out any failed uploads (None)
            uploaded_files_metadata = [res for res in results if res]
        except Exception as e:
            print(f"Parallel upload error: {e}")

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
        "attachments": uploaded_files_metadata, # Store full object list
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
        if "attachments" not in exp:
            exp["attachments"] = []
    return expenses

# ---------------- GET EXPENSE BY userId ----------------
@router.get("/user/{user_email}")
def get_expenses_by_user(user_email: str):
    expenses = list(expenses_collection.find({"userEmail": user_email}))
    for exp in expenses:
        exp["_id"] = str(exp["_id"])
        if "attachments" not in exp:
            exp["attachments"] = []
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
    keptAttachments: str = Form("[]"), # JSON string
    newAttachments: List[UploadFile] = File([])
):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid expense ID")

    existing_expense = expenses_collection.find_one({"_id": ObjectId(expense_id)})
    if not existing_expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # 1. Standard Fields Update
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

    # 2. Handle File Logic (Kept Files)
    try:
        kept_raw = json.loads(keptAttachments)
        kept_ids = []
        for item in kept_raw:
            if isinstance(item, dict):
                kept_ids.append(item.get('id'))
            else:
                kept_ids.append(item)
    except:
        kept_ids = []

    current_attachments = existing_expense.get("attachments", [])
    final_attachments = []
    
    # A. Delete Removed Files
    for att in current_attachments:
        att_id = att['id'] if isinstance(att, dict) else att
        
        if att_id in kept_ids:
            # Keep file
            if isinstance(att, dict):
                final_attachments.append(att)
            else:
                final_attachments.append({"id": att, "filename": "Legacy File"})
        else:
            # Delete file
            delete_file_from_drive(att_id)

    # 🟢 B. Upload New Files (Parallel)
    new_upload_tasks = []
    for file in newAttachments:
        new_upload_tasks.append(upload_file_to_drive(file))
    
    if new_upload_tasks:
        try:
            new_results = await asyncio.gather(*new_upload_tasks)
            # Add successful uploads to final list
            final_attachments.extend([res for res in new_results if res])
        except Exception as e:
            print(f"Parallel update upload error: {e}")

    update_data["attachments"] = final_attachments

    expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$set": update_data, "$currentDate": {"updatedAt": True}}
    )

    return {"message": "Expense updated successfully"}

# ---------------- DELETE EXPENSE ----------------
@router.delete("/delete")
def delete_expenses(payload: ExpenseDeleteRequest):
    deleted_expenses = []
    not_found_expenses = []

    for expense_id in payload.expenseIds:
        if not ObjectId.is_valid(expense_id):
            not_found_expenses.append(expense_id)
            continue

        expense = expenses_collection.find_one({"_id": ObjectId(expense_id)})
        if not expense:
            not_found_expenses.append(expense_id)
            continue

        # Delete all attachments in Drive
        attachments = expense.get("attachments", [])
        for att in attachments:
            att_id = att['id'] if isinstance(att, dict) else att
            delete_file_from_drive(att_id)

        expenses_collection.delete_one({"_id": ObjectId(expense_id)})
        deleted_expenses.append(expense_id)

    return {
        "message": "Expense delete operation completed",
        "deletedCount": len(deleted_expenses),
        "deletedExpenseIds": deleted_expenses,
        "notFoundExpenseIds": not_found_expenses
    }

# ---------------- DOWNLOAD ATTACHMENT ----------------
@router.get("/attachment/{file_id}")
def download_attachment(file_id: str):
    # 🟢 UPDATED: Use the streaming generator
    # This prevents the server from loading the full file into RAM
    # and starts the download immediately for the user.
    iterfile, filename, mime_type = stream_file_content(file_id)
    
    if iterfile is None:
        raise HTTPException(status_code=404, detail="File not found in Drive")

    return StreamingResponse(
        iterfile(),
        media_type=mime_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ---------------- DELETE SPECIFIC ATTACHMENT ----------------
@router.delete("/expense/{expense_id}/attachment/{file_id}")
def remove_attachment(expense_id: str, file_id: str):
    if not ObjectId.is_valid(expense_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 1. Delete from Drive
    delete_file_from_drive(file_id)

    # 2. Pull from DB
    expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$pull": {"attachments": {"id": file_id}}}
    )
    # Legacy support
    expenses_collection.update_one(
        {"_id": ObjectId(expense_id)},
        {"$pull": {"attachments": file_id}}
    )

    return {"message": "Attachment removed successfully"}