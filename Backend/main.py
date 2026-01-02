from fastapi import FastAPI
from routes.employee import router as employee_router
from routes.employee import router as employee_router
from routes.expense_type import router as expense_type_router
from routes.expense import router as expense
from fastapi.middleware.cors import CORSMiddleware
from routes.payment_mode import router as payment_mode_router
from routes.user_groups import router as user_group_router
from routes.db_settings import router as db_settings_router

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # 👈 allow all origins
    allow_credentials=False,    # 👈 MUST be False with "*"
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(employee_router)
app.include_router(employee_router)
app.include_router(expense_type_router)
app.include_router(expense)
app.include_router(payment_mode_router)
app.include_router(user_group_router)
app.include_router(db_settings_router)

@app.get("/")
def root():
    return {"message": "Employee Management API is running"}

# 👇 THIS IS WHAT MAKES python main.py WORK
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
