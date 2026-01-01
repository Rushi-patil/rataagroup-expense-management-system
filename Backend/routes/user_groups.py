from fastapi import APIRouter, HTTPException
from db import user_groups_collection, employee_collection
from models import UserGroupCreate, UserGroupUpdate
from datetime import datetime
from bson import ObjectId

router = APIRouter(
    prefix="/user-groups",
    tags=["User Groups"]
)

@router.post("/create")
def create_user_group(data: UserGroupCreate):

    # Validate employees
    for emp_id in data.users:
        if not employee_collection.find_one({"EmployeeID": emp_id}):
            raise HTTPException(
                status_code=400,
                detail=f"EmployeeID {emp_id} does not exist"
            )

    # Auto-increment Group ID (GRP001)
    last_group = user_groups_collection.find_one(
        {}, sort=[("groupId", -1)]
    )

    if last_group and "groupId" in last_group:
        last_num = int(last_group["groupId"].replace("GRP", ""))
        new_group_id = f"GRP{last_num + 1:03d}"
    else:
        new_group_id = "GRP001"

    group_data = {
        "groupId": new_group_id,
        "groupName": data.groupName,
        "description": data.description,
        "users": data.users,
        "isActive": data.isActive,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    user_groups_collection.insert_one(group_data)

    return {
        "message": "User group created successfully",
        "groupId": new_group_id
    }

@router.get("/all")
def get_all_groups():

    groups = list(user_groups_collection.find())

    for g in groups:
        g["_id"] = str(g["_id"])

    return {
        "count": len(groups),
        "groups": groups
    }

@router.get("/{group_id}")
def get_group_by_id(group_id: str):

    group = user_groups_collection.find_one({"groupId": group_id})

    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    group["_id"] = str(group["_id"])
    return group

@router.put("/update/{group_id}")
def update_user_group(group_id: str, data: UserGroupUpdate):

    update_data = {k: v for k, v in data.dict().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Validate employees if users updated
    if "users" in update_data:
        for emp_id in update_data["users"]:
            if not employee_collection.find_one({"EmployeeID": emp_id}):
                raise HTTPException(
                    status_code=400,
                    detail=f"EmployeeID {emp_id} does not exist"
                )

    result = user_groups_collection.update_one(
        {"groupId": group_id},
        {"$set": update_data, "$currentDate": {"updatedAt": True}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")

    return {"message": "User group updated successfully"}

@router.delete("/delete/{group_id}")
def delete_user_group(group_id: str):

    result = user_groups_collection.delete_one({"groupId": group_id})

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")

    return {"message": "User group deleted successfully"}
