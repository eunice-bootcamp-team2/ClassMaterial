좋아요, 이제 **파트 8 – Todo 이미지/파일 첨부 기능 + 업로드 API 설계** 갑니다.
지금까지 구조 안 깨지게, **기존 코드와 자연스럽게 이어지는 방식**으로 짤게요.

목표는:

> POST /api/todos/{todo_id}/attachments
> → 해당 Todo에 파일(이미지/문서 등)을 업로드해서 **서버에 저장**하고
> → 메타데이터(TodoAttachment)를 인메모리 “DB”에 기록하는 것.

최종 경로 예:

- 업로드: `POST /api/todos/{todo_id}/attachments`
- 목록: `GET /api/todos/{todo_id}/attachments`

---

### 1️⃣ 파일 저장을 위한 기본 경로/유틸 준비

1-1. 업로드 기본 디렉토리 설정

📁 `app/core/storage.py` (새 파일)
```python
# app/core/storage.py
from pathlib import Path

# 프로젝트 루트 기준 업로드 디렉토리
BASE_UPLOAD_DIR = Path("uploads")

def get_todo_upload_dir(todo_id: int) -> Path:
    """
    Todo 별 파일이 저장될 디렉토리 경로를 반환.
    예: uploads/todos/1/
    """
    todo_dir = BASE_UPLOAD_DIR / "todos" / str(todo_id)
    todo_dir.mkdir(parents=True, exist_ok=True)
    return todo_dir
```

> 실제 저장 경로는 uploads/todos/<todo_id>/파일명 이 됩니다.

---

1-2. 파일 저장 유틸 (비동기 업로드 처리)

📁 `app/services/file_storage_service.py` (새 파일)
```python
# app/services/file_storage_service.py
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

async def save_upload_file(upload_file: UploadFile, dest_dir: Path) -> Path:
    """
    업로드된 파일(UploadFile)을 지정된 디렉토리에 저장하고,
    실제 저장된 파일 경로(Path)를 반환.
    """
    # 파일명 충돌 방지를 위해 uuid prefix를 붙임
    safe_name = f"{uuid4().hex}_{upload_file.filename}"
    dest_path = dest_dir / safe_name

    # chunk 단위로 읽어서 저장 (대용량 업로드 대비)
    with dest_path.open("wb") as f:
        while True:
            chunk = await upload_file.read(8192)
            if not chunk:
                break
            f.write(chunk)

    await upload_file.close()
    return dest_path
```

---

### 2️⃣ Attachment 스키마 정의

**TodoAttachment** 메타데이터용 Pydantic 스키마를 만듭니다.

📁 `app/schemas/attachments.py` (새 파일)
```python
# app/schemas/attachments.py
from datetime import datetime
from pydantic import BaseModel, Field

class AttachmentBase(BaseModel):
    """공통 필드"""

    original_filename: str = Field(
        ...,
        description="업로드 당시 원본 파일 이름",
        example="screenshot.png",
    )
    file_path: str = Field(
        ...,
        description="서버 내부에 저장된 파일 경로 (상대경로)",
        example="uploads/todos/1/abcd1234_screenshot.png",
    )

class AttachmentRead(AttachmentBase):
    """클라이언트 응답용 스키마"""

    id: int
    todo_id: int
    uploaded_at: datetime

    class Config:
        from_attributes = True

```

> 지금은 읽기용(AttachmentRead) 만 있으면 충분합니다.
> 실제 생성은 파일 저장 + 메타데이터 조합으로 처리하니까요.

---

### 3️⃣ Attachment “모델 계층”(인메모리 저장소)

기존 Todo, Notification처럼 **인메모리 리스트**를 사용합니다.

📁 `app/models/attachments.py` (새 파일)
```python
# app/models/attachments.py
from datetime import datetime
from typing import List, Optional

from app.schemas.attachments import AttachmentRead

_fake_attachments_db: List[AttachmentRead] = []
_auto_attachment_id = 1

def create_attachment_record(
    todo_id: int,
    original_filename: str,
    file_path: str,
) -> AttachmentRead:
    """첨부파일 레코드를 인메모리 DB에 생성"""
    global _auto_attachment_id

    attachment = AttachmentRead(
        id=_auto_attachment_id,
        todo_id=todo_id,
        original_filename=original_filename,
        file_path=file_path,
        uploaded_at=datetime.utcnow(),
    )
    _auto_attachment_id += 1
    _fake_attachments_db.append(attachment)
    return attachment

def list_attachments_by_todo(todo_id: int) -> List[AttachmentRead]:
    """특정 Todo에 연결된 모든 첨부파일 목록"""
    return [a for a in _fake_attachments_db if a.todo_id == todo_id]

def get_attachment_by_id(attachment_id: int) -> Optional[AttachmentRead]:
    for a in _fake_attachments_db:
        if a.id == attachment_id:
            return a
    return None
```

---

### 4️⃣ Attachment 서비스 레이어

- Todo의 **주인(owner)** 만 첨부파일을 업로드/조회할 수 있게
- Todo 소유권을 체크하는 비즈니스 로직을 여기에 넣습니다.

📁 `app/services/attachment_service.py` (새 파일)
```python
# app/services/attachment_service.py
from pathlib import Path
from typing import List

from fastapi import HTTPException, status, UploadFile

from app.core.storage import get_todo_upload_dir
from app.models.attachments import (
    create_attachment_record,
    list_attachments_by_todo,
)
from app.models.todos import get_todo_by_id
from app.schemas.attachments import AttachmentRead
from app.schemas.users import UserRead
from app.services.file_storage_service import save_upload_file

def _ensure_todo_owned_by_user(todo_id: int, user: UserRead) -> None:
    """Todo가 현재 사용자 소유인지 확인 (권한 체크)"""
    todo = get_todo_by_id(todo_id)
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Todo {todo_id} not found",
        )
    if getattr(todo, "user_id", None) != user.id:
        # 권한 없음
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 Todo에 대한 권한이 없습니다.",
        )

async def create_attachment_for_todo(
    todo_id: int,
    file: UploadFile,
    current_user: UserRead,
) -> AttachmentRead:
    """
    Todo에 파일 첨부:
    1) Todo 소유권 확인
    2) 파일 실제 저장 (uploads/todos/<todo_id>/)
    3) 인메모리 Attachment 레코드 생성
    """
    _ensure_todo_owned_by_user(todo_id, current_user)

    # 2) 저장 디렉토리 확보
    dest_dir: Path = get_todo_upload_dir(todo_id)

    # 3) 실제 파일 저장
    saved_path = await save_upload_file(file, dest_dir)

    # file_path는 상대 경로 문자열로 저장
    relative_path = str(saved_path)

    # 4) 레코드 생성
    attachment = create_attachment_record(
        todo_id=todo_id,
        original_filename=file.filename,
        file_path=relative_path,
    )
    return attachment

def list_attachments_for_todo(
    todo_id: int,
    current_user: UserRead,
) -> List[AttachmentRead]:
    """
    Todo의 첨부파일 목록 조회 (소유자만)
    """
    _ensure_todo_owned_by_user(todo_id, current_user)
    return list_attachments_by_todo(todo_id)

```

> 여기서 소유권 체크는:
> - `get_todo_by_id(todo_id)` 가져와서
> - `todo.user_id == current_user.id` 비교
>     로 이루어집니다. (우리가 JWT 파트에서 user_id를 Todo에 넣어 둔 걸 가정)

---

### 5️⃣ Attachment 라우터(API) 추가

이제 실제 HTTP 엔드포인트를 만듭니다.

경로 설계:

- Router prefix: `/todos`
- 내부 path: `/{todo_id}/attachments`

→ 최종 URL: `/api/todos/{todo_id}/attachments`

📁 `app/api/routes/attachments.py` (새 파일)
```python
# app/api/routes/attachments.py
from typing import List

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.security import get_current_user
from app.schemas.attachments import AttachmentRead
from app.schemas.users import UserRead
from app.services.attachment_service import (
    create_attachment_for_todo,
    list_attachments_for_todo,
)

router = APIRouter()

@router.post(
    "/{todo_id}/attachments",
    response_model=AttachmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Todo에 파일 첨부",
)
async def upload_todo_attachment(
    todo_id: int,
    file: UploadFile = File(...),
    current_user: UserRead = Depends(get_current_user),
) -> AttachmentRead:
    """
    Todo에 파일(이미지/문서 등)을 첨부합니다.

    - multipart/form-data 로 파일 업로드
    - Todo의 소유자만 업로드 가능
    """
    attachment = await create_attachment_for_todo(
        todo_id=todo_id,
        file=file,
        current_user=current_user,
    )
    return attachment

@router.get(
    "/{todo_id}/attachments",
    response_model=List[AttachmentRead],
    summary="Todo 첨부파일 목록 조회",
)
def list_todo_attachments(
    todo_id: int,
    current_user: UserRead = Depends(get_current_user),
) -> List[AttachmentRead]:
    """
    Todo에 첨부된 모든 파일 목록을 조회합니다.
    - Todo 소유자만 조회 가능
    """
    return list_attachments_for_todo(todo_id, current_user)
```

---

### 6️⃣ API Gateway에 Attachment 라우터 연결

이제 **/api** 아래에 이 라우터를 붙여야 합니다.

📁 `app/api/router.py` 수정
```python
# app/api/router.py
from fastapi import APIRouter

from app.api.routes import auth, health, notifications, todos, attachments  # ✅ attachments 추가

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(todos.router, prefix="/todos", tags=["Todos"])
api_router.include_router(
    notifications.router, prefix="/notifications", tags=["Notifications"]
)

# ✅ Todo 첨부파일 관련
api_router.include_router(
    attachments.router,
    prefix="/todos",
    tags=["Attachments"],
)
```

> prefix="/todos"로 붙였기 때문에
> `attachments.py` 안의 `/{todo_id}/attachments` 와 합쳐져
> 최종 경로는 `/api/todos/{todo_id}/attachments` 가 됩니다.

---

### 7️⃣ (선택) 정적 파일 서빙 – 업로드 파일 접근용

첨부파일을 실제로 **브라우저에서 보고 싶다면**,

FastAPI의 `StaticFiles`를 이용해서 `/files` 경로로 매핑할 수 있습니다.

📁 `app/main.py` 에 static mount 추가
```python
# app/main.py
import asyncio
from contextlib import suppress
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.services.notification_queue import notification_worker_loop

app = FastAPI(
    title="TaskBoard API",
    description="사용자별 Task/Todo + 알림 관리용 FastAPI 백엔드",
    version="0.3.0",
)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Welcome to TaskBoard API (via /api/*)"}

# ✅ 정적 파일 (업로드된 첨부파일) 서빙
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/files", StaticFiles(directory=str(UPLOAD_DIR)), name="files")

# ✅ API Gateway
app.include_router(api_router, prefix="/api")

_worker_task: asyncio.Task | None = None

@app.on_event("startup")
async def on_startup() -> None:
    global _worker_task
    _worker_task = asyncio.create_task(notification_worker_loop())
    print("[Main] Notification worker started")

@app.on_event("shutdown")
async def on_shutdown() -> None:
    global _worker_task
    if _worker_task is not None:
        _worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await _worker_task
        print("[Main] Notification worker stopped")
```

이제 저장된 파일 경로가 예를 들어:
```
uploads/todos/1/abcd1234_screenshot.png
```

라면 브라우저에서:
```
GET <http://127.0.0.1:8000/files/todos/1/abcd1234_screenshot.png>
```

으로 접근할 수 있습니다.

> (실무에서는 Nginx/CloudFront 등에서 static 처리를 하는 경우가 많지만,
> 학습/로컬 환경에서는 이 정도면 충분합니다.)

---

### 8️⃣ 테스트 흐름 정리

1. 서버 실행
```bash
uvicorn app.main:app --reload
```

1. 회원가입 & 로그인 → 토큰 확보 (`/api/auth/signup`, `/api/auth/login`)
    
2. Swagger `/docs` → **Authorize** → Bearer 토큰 입력
    
3. Todo 하나 생성
    - `POST /api/todos/`
    - 응답으로 `id` (예: 1)를 기억
    
4. 해당 Todo에 첨부파일 업로드
    - `POST /api/todos/1/attachments`
    - `form-data` Body에서 `file` 필드로 이미지/파일 선택
    - 응답 예:
```json
{
	"id": 1,
	"todo_id": 1,
	"original_filename": "test.png",
	"file_path": "uploads/todos/1/5b3f0e3c4e2f4a3d_test.png",
	"uploaded_at": "2025-12-11T06:30:00.000000"
}
```
        
5. 첨부파일 목록 조회
    - `GET /api/todos/1/attachments`
6. 실제 파일 열어보기
    - 브라우저에서:
        
```
<http://127.0.0.1:8000/files/todos/1/5b3f0e3c4e2f4a3d_test.png> 
```

---

### 지금까지 구조가 어떻게 쌓였는지 정리

- **Todo**: CRUD + 필터/정렬/페이지네이션 + JWT 사용자별 소유
- **Redis**:
    - `/api/todos/stats` 캐시
    - 알림(Notification) 비동기 큐
- **Notification**:
    - Todo 생성 시 Redis 큐로 이벤트 → 워커가 소비해 레코드 생성
- **Attachment (이번 파트)**:
    - Todo별 첨부파일 업로드
    - 인메모리 메타데이터 + 로컬 디스크 저장
    - `/api/todos/{todo_id}/attachments` 로 API 제공
    - `/files/...` 로 실제 파일 서빙

이 상태면, **실전 Todo 백엔드**에서 필요한 요소들(인증, 권한, 파일 첨부, 캐싱, 비동기 알림)의 큰 골격이 다 갖춰진 셈이에요.

다음 파트에서 DB(SQLAlchemy)로 바꿔도, 지금 구조 그대로 교체만 하면 됩니다.