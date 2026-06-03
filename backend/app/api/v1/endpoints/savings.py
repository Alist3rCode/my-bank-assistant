from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.saving import Saving
from app.schemas.saving import SavingCreate, SavingUpdate, SavingRead

router = APIRouter(prefix="/savings", tags=["savings"])


@router.get("/", response_model=list[SavingRead])
def list_savings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Saving).filter(Saving.user_id == current_user.id, Saving.is_active.is_(True)).all()


@router.post("/", response_model=SavingRead, status_code=201)
def create_saving(data: SavingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = Saving(user_id=current_user.id, **data.model_dump())
    db.add(saving)
    db.commit()
    db.refresh(saving)
    return saving


@router.get("/{saving_id}", response_model=SavingRead)
def get_saving(saving_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = db.query(Saving).filter(Saving.id == saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Épargne introuvable")
    return saving


@router.patch("/{saving_id}", response_model=SavingRead)
def update_saving(
    saving_id: int,
    data: SavingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    saving = db.query(Saving).filter(Saving.id == saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Épargne introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(saving, field, value)
    db.commit()
    db.refresh(saving)
    return saving


@router.delete("/{saving_id}", status_code=204)
def delete_saving(saving_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    saving = db.query(Saving).filter(Saving.id == saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Épargne introuvable")
    saving.is_active = False
    db.commit()


@router.get("/summary/total")
def savings_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from sqlalchemy import func
    result = db.query(func.sum(Saving.current_amount)).filter(
        Saving.user_id == current_user.id,
        Saving.is_active.is_(True),
    ).scalar() or 0.0
    return {"total_savings": result}
