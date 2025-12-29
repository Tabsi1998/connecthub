from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
from jose import JWTError, jwt
import os
import base64
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ConnectHub API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Settings
SECRET_KEY = os.getenv("JWT_SECRET", "connecthub-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "connecthub")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

security = HTTPBearer()

# Helper to convert ObjectId
def serialize_doc(doc):
    if doc is None:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "password_hash" in doc:
        del doc["password_hash"]
    return doc

def serialize_list(docs):
    return [serialize_doc(doc) for doc in docs]

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=2)
    role: str = "mitglied"  # admin, trainer, mitglied, gast

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    position: Optional[str] = None  # Funktion im Verein
    avatar: Optional[str] = None  # base64

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "allgemein"  # vorstand, mitglieder, team, projekt, events

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class MessageCreate(BaseModel):
    content: str

class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    date: str  # ISO format
    time: Optional[str] = None
    location: Optional[str] = None
    group_id: Optional[str] = None
    max_participants: Optional[int] = None

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    max_participants: Optional[int] = None

class DocumentCreate(BaseModel):
    name: str
    group_id: Optional[str] = None
    content: str  # base64
    file_type: str

# ==================== AUTH ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Ungültiger Token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Ungültiger Token")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if user is None:
        raise HTTPException(status_code=401, detail="Benutzer nicht gefunden")
    return serialize_doc(user)

@app.post("/api/auth/register")
async def register(user: UserRegister):
    # Check if email exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="E-Mail bereits registriert")
    
    # Hash password
    password_hash = bcrypt.hashpw(user.password.encode(), bcrypt.gensalt()).decode()
    
    # Create user
    user_doc = {
        "email": user.email,
        "password_hash": password_hash,
        "name": user.name,
        "role": user.role,
        "phone": None,
        "position": None,
        "avatar": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.users.insert_one(user_doc)
    
    # Create token
    token = create_access_token({"sub": str(result.inserted_id)})
    
    user_doc["_id"] = result.inserted_id
    return {"token": token, "user": serialize_doc(user_doc)}

@app.post("/api/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    if not bcrypt.checkpw(credentials.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    
    token = create_access_token({"sub": str(user["_id"])})
    return {"token": token, "user": serialize_doc(user)}

@app.get("/api/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ==================== USERS ====================

@app.get("/api/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find().to_list(1000)
    return serialize_list(users)

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Benutzer nicht gefunden")
    return serialize_doc(user)

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(get_current_user)):
    # Only self or admin can update
    if current_user["id"] != user_id and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user)

@app.put("/api/users/{user_id}/role")
async def update_user_role(user_id: str, role: str, current_user: dict = Depends(get_current_user)):
    # Only admin can change roles
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Nur Admins können Rollen ändern")
    
    if role not in ["admin", "trainer", "mitglied", "gast"]:
        raise HTTPException(status_code=400, detail="Ungültige Rolle")
    
    await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": role}})
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    return serialize_doc(user)

# ==================== GROUPS ====================

@app.post("/api/groups")
async def create_group(group: GroupCreate, current_user: dict = Depends(get_current_user)):
    # Only admin or trainer can create groups
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    group_doc = {
        "name": group.name,
        "description": group.description,
        "type": group.type,
        "created_by": current_user["id"],
        "members": [current_user["id"]],
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.groups.insert_one(group_doc)
    group_doc["_id"] = result.inserted_id
    return serialize_doc(group_doc)

@app.get("/api/groups")
async def get_groups(current_user: dict = Depends(get_current_user)):
    # Admin sees all, others see only their groups
    if current_user["role"] == "admin":
        groups = await db.groups.find().to_list(1000)
    else:
        groups = await db.groups.find({"members": current_user["id"]}).to_list(1000)
    return serialize_list(groups)

@app.get("/api/groups/{group_id}")
async def get_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    return serialize_doc(group)

@app.put("/api/groups/{group_id}")
async def update_group(group_id: str, data: GroupUpdate, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await db.groups.update_one({"_id": ObjectId(group_id)}, {"$set": update_data})
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    return serialize_doc(group)

@app.delete("/api/groups/{group_id}")
async def delete_group(group_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Nur Admins können Gruppen löschen")
    
    await db.groups.delete_one({"_id": ObjectId(group_id)})
    # Delete all messages in group
    await db.messages.delete_many({"group_id": group_id})
    return {"message": "Gruppe gelöscht"}

@app.post("/api/groups/{group_id}/members/{user_id}")
async def add_member(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$addToSet": {"members": user_id}}
    )
    
    # Create notification
    await db.notifications.insert_one({
        "user_id": user_id,
        "type": "group_added",
        "message": f"Du wurdest zur Gruppe hinzugefügt",
        "group_id": group_id,
        "read": False,
        "created_at": datetime.utcnow().isoformat(),
    })
    
    return {"message": "Mitglied hinzugefügt"}

@app.delete("/api/groups/{group_id}/members/{user_id}")
async def remove_member(group_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.groups.update_one(
        {"_id": ObjectId(group_id)},
        {"$pull": {"members": user_id}}
    )
    return {"message": "Mitglied entfernt"}

# ==================== MESSAGES ====================

@app.post("/api/groups/{group_id}/messages")
async def send_message(group_id: str, message: MessageCreate, current_user: dict = Depends(get_current_user)):
    group = await db.groups.find_one({"_id": ObjectId(group_id)})
    if not group:
        raise HTTPException(status_code=404, detail="Gruppe nicht gefunden")
    
    if current_user["id"] not in group.get("members", []) and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Du bist kein Mitglied dieser Gruppe")
    
    msg_doc = {
        "group_id": group_id,
        "sender_id": current_user["id"],
        "sender_name": current_user["name"],
        "content": message.content,
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.messages.insert_one(msg_doc)
    msg_doc["_id"] = result.inserted_id
    
    # Create notifications for other members
    for member_id in group.get("members", []):
        if member_id != current_user["id"]:
            await db.notifications.insert_one({
                "user_id": member_id,
                "type": "new_message",
                "message": f"Neue Nachricht von {current_user['name']} in {group['name']}",
                "group_id": group_id,
                "read": False,
                "created_at": datetime.utcnow().isoformat(),
            })
    
    return serialize_doc(msg_doc)

@app.get("/api/groups/{group_id}/messages")
async def get_messages(group_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({"group_id": group_id}).sort("created_at", -1).limit(limit).to_list(limit)
    return serialize_list(messages)[::-1]  # Return in chronological order

# ==================== EVENTS ====================

@app.post("/api/events")
async def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    event_doc = {
        "title": event.title,
        "description": event.description,
        "date": event.date,
        "time": event.time,
        "location": event.location,
        "group_id": event.group_id,
        "max_participants": event.max_participants,
        "created_by": current_user["id"],
        "attendees": [],
        "declined": [],
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.events.insert_one(event_doc)
    event_doc["_id"] = result.inserted_id
    
    # Notify all users about new event
    users = await db.users.find().to_list(1000)
    for user in users:
        if str(user["_id"]) != current_user["id"]:
            await db.notifications.insert_one({
                "user_id": str(user["_id"]),
                "type": "new_event",
                "message": f"Neuer Termin: {event.title}",
                "event_id": str(result.inserted_id),
                "read": False,
                "created_at": datetime.utcnow().isoformat(),
            })
    
    return serialize_doc(event_doc)

@app.get("/api/events")
async def get_events(current_user: dict = Depends(get_current_user)):
    events = await db.events.find().sort("date", 1).to_list(1000)
    return serialize_list(events)

@app.get("/api/events/upcoming")
async def get_upcoming_events(limit: int = 5, current_user: dict = Depends(get_current_user)):
    today = datetime.utcnow().strftime("%Y-%m-%d")
    events = await db.events.find({"date": {"$gte": today}}).sort("date", 1).limit(limit).to_list(limit)
    return serialize_list(events)

@app.get("/api/events/{event_id}")
async def get_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    return serialize_doc(event)

@app.put("/api/events/{event_id}")
async def update_event(event_id: str, data: EventUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    update_data = {k: v for k, v in data.dict().items() if v is not None}
    await db.events.update_one({"_id": ObjectId(event_id)}, {"$set": update_data})
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    return serialize_doc(event)

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.events.delete_one({"_id": ObjectId(event_id)})
    return {"message": "Termin gelöscht"}

@app.post("/api/events/{event_id}/attend")
async def attend_event(event_id: str, current_user: dict = Depends(get_current_user)):
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    if not event:
        raise HTTPException(status_code=404, detail="Termin nicht gefunden")
    
    # Check max participants
    if event.get("max_participants") and len(event.get("attendees", [])) >= event["max_participants"]:
        raise HTTPException(status_code=400, detail="Maximale Teilnehmerzahl erreicht")
    
    await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {
            "$addToSet": {"attendees": current_user["id"]},
            "$pull": {"declined": current_user["id"]}
        }
    )
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    return serialize_doc(event)

@app.post("/api/events/{event_id}/decline")
async def decline_event(event_id: str, current_user: dict = Depends(get_current_user)):
    await db.events.update_one(
        {"_id": ObjectId(event_id)},
        {
            "$addToSet": {"declined": current_user["id"]},
            "$pull": {"attendees": current_user["id"]}
        }
    )
    event = await db.events.find_one({"_id": ObjectId(event_id)})
    return serialize_doc(event)

# ==================== NOTIFICATIONS ====================

@app.get("/api/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(50).to_list(50)
    return serialize_list(notifications)

@app.get("/api/notifications/unread/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    return {"count": count}

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"_id": ObjectId(notification_id), "user_id": current_user["id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Als gelesen markiert"}

@app.put("/api/notifications/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "Alle als gelesen markiert"}

# ==================== DOCUMENTS ====================

@app.post("/api/documents")
async def upload_document(doc: DocumentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    doc_data = {
        "name": doc.name,
        "group_id": doc.group_id,
        "content": doc.content,
        "file_type": doc.file_type,
        "uploaded_by": current_user["id"],
        "uploader_name": current_user["name"],
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.documents.insert_one(doc_data)
    doc_data["_id"] = result.inserted_id
    # Don't return content in list view
    response = serialize_doc(doc_data)
    del response["content"]
    return response

@app.get("/api/documents")
async def get_documents(group_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if group_id:
        query["group_id"] = group_id
    
    docs = await db.documents.find(query).sort("created_at", -1).to_list(1000)
    # Don't include content in list
    result = []
    for doc in docs:
        d = serialize_doc(doc)
        if "content" in d:
            del d["content"]
        result.append(d)
    return result

@app.get("/api/documents/{doc_id}")
async def get_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.documents.find_one({"_id": ObjectId(doc_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden")
    return serialize_doc(doc)

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "trainer"]:
        raise HTTPException(status_code=403, detail="Keine Berechtigung")
    
    await db.documents.delete_one({"_id": ObjectId(doc_id)})
    return {"message": "Dokument gelöscht"}

# ==================== DASHBOARD ====================

@app.get("/api/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    # Get upcoming events
    today = datetime.utcnow().strftime("%Y-%m-%d")
    upcoming_events = await db.events.find({"date": {"$gte": today}}).sort("date", 1).limit(5).to_list(5)
    
    # Get unread notifications count
    unread_count = await db.notifications.count_documents({"user_id": current_user["id"], "read": False})
    
    # Get recent notifications
    notifications = await db.notifications.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(5).to_list(5)
    
    # Get user's groups
    if current_user["role"] == "admin":
        groups = await db.groups.find().to_list(1000)
    else:
        groups = await db.groups.find({"members": current_user["id"]}).to_list(1000)
    
    # Get member count
    member_count = await db.users.count_documents({})
    
    # Get recent documents
    recent_docs = await db.documents.find().sort("created_at", -1).limit(5).to_list(5)
    for doc in recent_docs:
        if "content" in doc:
            del doc["content"]
    
    return {
        "upcoming_events": serialize_list(upcoming_events),
        "unread_notifications": unread_count,
        "recent_notifications": serialize_list(notifications),
        "groups": serialize_list(groups),
        "member_count": member_count,
        "recent_documents": serialize_list(recent_docs),
    }

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "app": "ConnectHub"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
