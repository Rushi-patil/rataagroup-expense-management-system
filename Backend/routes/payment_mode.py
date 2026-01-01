from fastapi import APIRouter, HTTPException
from bson import ObjectId
from datetime import datetime
from db import payment_mode_collection
from models import PaymentModeCreate, PaymentModeUpdate

router = APIRouter(
    prefix="/payment-mode",
    tags=["Payment Mode"]
)

@router.post("/create")
def create_payment_mode(payload: PaymentModeCreate):

    existing = payment_mode_collection.find_one(
        {"paymentModeName": payload.paymentModeName}
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Payment mode already exists"
        )

    data = {
        "paymentModeName": payload.paymentModeName,
        "isActive": payload.isActive,
        "createdAt": datetime.now(),
        "updatedAt": datetime.now()
    }

    result = payment_mode_collection.insert_one(data)
    return {
        "message": "Payment mode created successfully",
        "paymentModeId": str(result.inserted_id)
    }

@router.get("/all")
def get_all_payment_modes():
    modes = list(payment_mode_collection.find())
    for mode in modes:
        mode["_id"] = str(mode["_id"])
    return modes

# 📌 Get only active expense types
@router.get("/active")
def get_active_expense_types():
    expense_types = list(
        payment_mode_collection.find(
            {"isActive": True}
        )
    )
    for expense in expense_types:
        expense["_id"] = str(expense["_id"])  # convert ObjectId → string
    return expense_types

@router.get("/{payment_mode_id}")
def get_payment_mode(payment_mode_id: str):

    if not ObjectId.is_valid(payment_mode_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    mode = payment_mode_collection.find_one(
        {"_id": ObjectId(payment_mode_id)}
    )

    if not mode:
        raise HTTPException(
            status_code=404,
            detail="Payment mode not found"
        )

    mode["_id"] = str(mode["_id"])
    return mode

@router.put("/update/{payment_mode_id}")
def update_payment_mode(
    payment_mode_id: str,
    payload: PaymentModeUpdate
):

    if not ObjectId.is_valid(payment_mode_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    update_data = {
        k: v for k, v in payload.dict().items() if v is not None
    }

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No fields provided to update"
        )

    update_data["updatedAt"] = datetime.now()

    result = payment_mode_collection.update_one(
        {"_id": ObjectId(payment_mode_id)},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Payment mode not found"
        )

    return {"message": "Payment mode updated successfully"}

@router.delete("/remove/{payment_mode_id}")
def remove_payment_mode(payment_mode_id: str):

    if not ObjectId.is_valid(payment_mode_id):
        raise HTTPException(status_code=400, detail="Invalid ID")

    result = payment_mode_collection.delete_one(
        {"_id": ObjectId(payment_mode_id)}
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Payment mode not found"
        )

    return {"message": "Payment mode removed successfully"}

