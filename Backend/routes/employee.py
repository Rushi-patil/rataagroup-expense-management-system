from fastapi import APIRouter, HTTPException
from models import EmployeeCreate, EmployeeLogin, ForgotPasswordRequest, ForgotPasswordVerify, EmployeeUpdate, RoleAssignmentRequest
from db import employee_collection, user_groups_collection
from passlib.context import CryptContext
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta
import random
from maileroo import MailerooClient, EmailAddress
import os
from bson import ObjectId


maileroo_client = MailerooClient(os.getenv("MAILEROO_API_KEY"))

router = APIRouter(
    prefix="/employee",
    tags=["Employee"]
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def generate_employee_id():
    last_employee = employee_collection.find_one(
        {"EmployeeID": {"$regex": "^RATAA"}},
        sort=[("EmployeeID", -1)]
    )

    if not last_employee:
        return "RATAA0001"

    last_id = last_employee["EmployeeID"]  # e.g. RATAA0007
    number = int(last_id.replace("RATAA", ""))
    new_number = number + 1

    return f"RATAA{new_number:04d}"

#Add new Employee

@router.post("/add")
def add_employee(employee: EmployeeCreate):

    if employee_collection.find_one({"Email": employee.Email}):
        raise HTTPException(status_code=400, detail="Email already exists")

    employee_data = employee.dict(exclude={"EmployeeID"})
    employee_data["EmployeeID"] = generate_employee_id()
    employee_data["Password"] = hash_password(employee.Password)
    employee_data["isActive"] = True
    employee_data["CreatedAt"] = datetime.now()

    employee_collection.insert_one(employee_data)

    return {
        "message": "Employee added successfully",
        "EmployeeID": employee_data["EmployeeID"]
    }

# Get All Employee details
@router.get("/all-details")
def get_all_employee_details():

    employees = list(
        employee_collection.find(
            {},
            {
                "Password": 0,
                "OTP": 0,
                "OTPExpiry": 0
            }
        )
    )

    for emp in employees:
        emp["_id"] = str(emp["_id"])
        emp["Role"] = (
            "Admin"
            if emp.get("Email", "").lower() == "admin@rataagroup.com"
            else "Employee"
        )

    return {
        "count": len(employees),
        "employees": employees
    }


#update without password:
@router.put("/update/{employee_id}")
def update_employee(employee_id: str, data: EmployeeUpdate):

    update_data = data.dict(exclude_none=True)

    # Absolute protection
    if "EmployeeID" in update_data:
        raise HTTPException(
            status_code=400,
            detail="EmployeeID cannot be updated"
        )

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No valid fields provided for update"
        )

    result = employee_collection.update_one(
        {"EmployeeID": employee_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {
        "message": "Employee updated successfully",
        "updatedFields": update_data
    }

#Remove Employee by EmployeeID

@router.delete("/remove/{employee_id}")
def remove_employee(employee_id: str):

    result = employee_collection.delete_one(
        {"EmployeeID": employee_id}
    )

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"message": "Employee removed successfully"}

#login API

@router.post("/login")
def login_employee(login_data: EmployeeLogin):

    employee = employee_collection.find_one(
        {"Email": login_data.Email}
    )

    if not employee or not verify_password(
        login_data.Password, employee["Password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if employee.get("isActive") is False:
        raise HTTPException(
            status_code=403,
            detail="Employee account is inactive"
        )

    role = "Admin" if login_data.Email.lower() == "admin@rataagroup.com" else "Employee"

    return {
        "message": "Login successful",
        "EmployeeID": employee["EmployeeID"],
        "EmployeeName": employee["EmployeeName"],
        "Email": employee["Email"],
        "Role": role,
        "isActive": employee.get("isActive", True),

        # ✅ IDs only
        "AssignedExpenseTypeIds": employee.get("AssignedExpenseTypeIds", []),
        "AssignedPaymentModeIds": employee.get("AssignedPaymentModeIds", [])
    }


# ---------- Step 1: Request OTP ----------
@router.post("/forgot-password/request")
def forgot_password_request(data: ForgotPasswordRequest):
    employee = employee_collection.find_one({"Email": data.Email})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Generate 6-digit OTP
    otp = str(random.randint(100000, 999999))
    expiry = datetime.now() + timedelta(minutes=10)

    # Update OTP in DB
    employee_collection.update_one(
        {"Email": data.Email},
        {"$set": {"OTP": otp, "OTPExpiry": expiry}}
    )

    # Prepare Maileroo email data
    email_data = {
        "from": EmailAddress(
            "rataagroup@bfbbc79e67369a72.maileroo.org",
            "Rataa Group"
        ),
        "to": [
            EmailAddress(data.Email)
        ],
        "subject": "Your Password Reset OTP",
        "plain": f"""
Hello,

Your OTP for password reset is: {otp}

This OTP is valid for 10 minutes.
If you did not request this, please ignore this email.

Regards,
Rataa Group
        """,
        "html": f"""
<h2>Password Reset OTP</h2>
<p>Your OTP for password reset is:</p>
<h3>{otp}</h3>
<p>This OTP is valid for <b>10 minutes</b>.</p>
<p>If you did not request this, please ignore this email.</p>
<br />
<p>Regards,<br /><b>Rataa Group</b></p>
        """
    }

    try:
        reference_id = maileroo_client.send_basic_email(email_data)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send OTP email: {str(e)}"
        )

    return {
        "message": "OTP sent to email successfully",
        "referenceId": reference_id
    }

# ---------- Step 2: Verify OTP and Reset Password ----------
@router.post("/forgot-password/verify")
def forgot_password_verify(data: ForgotPasswordVerify):
    employee = employee_collection.find_one({"Email": data.Email})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # Check OTP
    if employee.get("OTP") != data.OTP:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    if datetime.now() > employee.get("OTPExpiry"):
        raise HTTPException(status_code=400, detail="OTP expired")

    # Hash new password
    new_hashed = hash_password(data.NewPassword)

    # Update password and remove OTP
    employee_collection.update_one(
        {"Email": data.Email},
        {"$set": {"Password": new_hashed}, "$unset": {"OTP": "", "OTPExpiry": ""}}
    )

    return {"message": "Password reset successfully"}

@router.get("/all")
def get_all_employees():
    employees = list(
        employee_collection.find(
            {"Email": {"$ne": "admin@rataagroup.com"}},  # Exclude admin
            {
                "Password": 0,
                "OTP": 0,
                "OTPExpiry": 0
            }
        )
    )

    # Convert ObjectId to string
    for emp in employees:
        emp["_id"] = str(emp["_id"])

    return {
        "count": len(employees),
        "employees": employees
    }

#Assignment API
@router.put("/apply")
def apply_assignments(payload: RoleAssignmentRequest):

    employee_ids = []

    # 🔹 Resolve target
    if payload.targetType == "USER":
        employee = employee_collection.find_one(
            {"EmployeeID": payload.targetId}
        )
        if not employee:
            raise HTTPException(
                status_code=404,
                detail="Employee not found"
            )
        employee_ids = [payload.targetId]

    elif payload.targetType == "GROUP":
        group = user_groups_collection.find_one(
            {"groupId": payload.targetId}
        )
        if not group:
            raise HTTPException(
                status_code=404,
                detail="Group not found"
            )

        employee_ids = group.get("users", [])

        if not employee_ids:
            raise HTTPException(
                status_code=400,
                detail="Group has no users"
            )

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid targetType. Use USER or GROUP"
        )

    # 🔹 Validate ObjectIds
    for field in ["AssignedExpenseTypeIds", "AssignedPaymentModeIds"]:
        ids = getattr(payload, field)
        if ids:
            for _id in ids:
                if not ObjectId.is_valid(_id):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Invalid ID in {field}"
                    )

    # 🔹 Prepare update data
    update_data = {}

    if payload.role is not None:
        update_data["Role"] = payload.role

    if payload.AssignedExpenseTypeIds is not None:
        update_data["AssignedExpenseTypeIds"] = payload.AssignedExpenseTypeIds

    if payload.AssignedPaymentModeIds is not None:
        update_data["AssignedPaymentModeIds"] = payload.AssignedPaymentModeIds

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Nothing to assign"
        )

    # 🔹 Apply assignments
    result = employee_collection.update_many(
        {"EmployeeID": {"$in": employee_ids}},
        {"$set": update_data}
    )

    return {
        "message": "Assignments applied successfully",
        "targetType": payload.targetType,
        "targetId": payload.targetId,
        "affectedEmployees": result.modified_count,
        "assignments": update_data
    }