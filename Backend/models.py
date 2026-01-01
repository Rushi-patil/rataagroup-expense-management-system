from pydantic import BaseModel, EmailStr
from typing import List, Optional
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


class PaymentModeCreate(BaseModel):
    paymentModeName: str
    isActive: Optional[bool] = True


class PaymentModeUpdate(BaseModel):
    paymentModeName: Optional[str]
    isActive: Optional[bool]