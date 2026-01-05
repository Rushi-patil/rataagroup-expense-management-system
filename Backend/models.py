from pydantic import BaseModel, EmailStr
from typing import List, Literal, Optional
from datetime import datetime

# Employee creation
class EmployeeCreate(BaseModel):
    EmployeeName: str
    MobileNO: str
    Email: EmailStr
    Password: str

# Employee login
class EmployeeLogin(BaseModel):
    Email: EmailStr
    Password: str

#update only without password
class EmployeeUpdate(BaseModel):
    EmployeeName: Optional[str]
    Email: Optional[EmailStr]
    MobileNo: Optional[str]
    isActive: Optional[bool]

# Assignments:
class RoleAssignmentRequest(BaseModel):
    targetType: str  # "USER" or "GROUP"
    targetId: str    # EmployeeID or groupId

    role: Optional[str] = None
    AssignedExpenseTypeIds: Optional[List[str]] = None
    AssignedPaymentModeIds: Optional[List[str]] = None

# Employee forgot password (simple version)
class EmployeeForgotPassword(BaseModel):
    Email: EmailStr
    NewPassword: str

# OR if using OTP version:
class ForgotPasswordRequest(BaseModel):
    Email: EmailStr

class ForgotPasswordVerify(BaseModel):
    Email: EmailStr
    OTP: str
    NewPassword: str

class ExpenseTypeCreate(BaseModel):
    ExpenseTypeName: str
    Description: Optional[str] = None
    IsActive: bool = True

class ExpenseTypeUpdate(BaseModel):
    ExpenseTypeName: Optional[str] = None
    Description: Optional[str] = None
    IsActive: Optional[bool] = None

class ExpenseCreate(BaseModel):
    expenseTypeId: str
    title: str
    date: datetime
    amount: float
    paymentMode: str
    billAvailable: bool
    userEmail: str
    description: Optional[str] = ""
    carNumber: Optional[str] = ""
    serviceType: Optional[str] = ""
    location: Optional[str] = ""
    equipmentName: Optional[str] = ""
    equipmentType: Optional[str] = ""
    attachments: Optional[List[str]] = []  # store GridFS file IDs as strings

class ExpenseUpdate(BaseModel):
    expenseTypeId: Optional[str]
    title: Optional[str]
    date: Optional[datetime]
    amount: Optional[float]
    paymentMode: Optional[str]
    billAvailable: Optional[bool]
    description: Optional[str]
    carNumber: Optional[str]
    serviceType: Optional[str]
    location: Optional[str]
    equipmentName: Optional[str]
    equipmentType: Optional[str]

class ExpenseDeleteRequest(BaseModel):
    expenseIds: List[str]
    
class PaymentModeCreate(BaseModel):
    paymentModeName: str
    isActive: Optional[bool] = True


class PaymentModeUpdate(BaseModel):
    paymentModeName: Optional[str]
    isActive: Optional[bool]

#user groups
class UserGroupCreate(BaseModel):
    groupName: str
    description: Optional[str] = ""
    users: List[str] = []
    isActive: Optional[bool] = True

class UserGroupUpdate(BaseModel):
    groupName: Optional[str]
    description: Optional[str]
    users: Optional[List[str]]
    isActive: Optional[bool]