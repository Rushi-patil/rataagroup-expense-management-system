from fastapi import APIRouter, HTTPException
from models import ExpenseTypeCreate, ExpenseTypeUpdate
from db import expense_type_collection
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/expense-type",
    tags=["Expense Type"]
)
# ➕ Create Expense Type
@router.post("/add")
def add_expense_type(expense_type: ExpenseTypeCreate):

    if expense_type_collection.find_one({
        "$or": [
            {"ExpenseTypeName": expense_type.ExpenseTypeName}
        ]
    }):
        raise HTTPException(
            status_code=400,
            detail="Expense type already exists"
        )

    expense_type_collection.insert_one({
        "ExpenseTypeName": expense_type.ExpenseTypeName,
        "Description": expense_type.Description,
        "IsActive": expense_type.IsActive,
        "CreatedAt": datetime.now()
    })

    return {"message": "Expense type created successfully"}


# ✏️ Update Expense Type
@router.put("/update/{expense_type_id}")
def update_expense_type(
    expense_type_id: str,
    expense_type: ExpenseTypeUpdate
):
    # Validate ObjectId
    if not ObjectId.is_valid(expense_type_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid expense type ID"
        )

    # Remove None values
    update_data = {
        k: v for k, v in expense_type.dict().items()
        if v is not None
    }

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided to update"
        )

    result = expense_type_collection.update_one(
        {"_id": ObjectId(expense_type_id)},
        {
            "$set": update_data,
            "$currentDate": {"UpdatedAt": True}
        }
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Expense type not found"
        )

    return {
        "message": "Expense type updated successfully",
        "expense_type_id": expense_type_id
    }


# ❌ Remove (Soft Delete) Expense Type
@router.delete("/remove/{expense_type_id}")
def remove_expense_type(expense_type_id: str):

    try:
        result = expense_type_collection.delete_one(
            {"_id": ObjectId(expense_type_id)}
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid expense type ID format"
        )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Expense type not found"
        )

    return {"message": "Expense type removed successfully"}
# 📌 Get all expense types
@router.get("/all")
def get_all_expense_types():
    expense_types = list(expense_type_collection.find({}))

    for expense in expense_types:
        expense["_id"] = str(expense["_id"])  # convert ObjectId → string

    return expense_types

# 📌 Get only active expense types
@router.get("/active")
def get_active_expense_types():
    expense_types = list(
        expense_type_collection.find(
            {"IsActive": True}
        )
    )
    for expense in expense_types:
        expense["_id"] = str(expense["_id"])  # convert ObjectId → string
    return expense_types


@router.get("/{expense_type_id}")
def get_expense_type_by_id(expense_type_id: str):

    try:
        expense_type = expense_type_collection.find_one(
            {"_id": ObjectId(expense_type_id)},
            {"_id": 0}  # optional: hide _id in response
        )
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Invalid expense type ID format"
        )

    if not expense_type:
        raise HTTPException(
            status_code=404,
            detail="Expense type not found"
        )

    return expense_type

