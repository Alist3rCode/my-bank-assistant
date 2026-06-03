from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectSavingAllocation
from app.models.saving import Saving
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead, ProjectSavingAllocationCreate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/", response_model=list[ProjectRead])
def list_projects(
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = db.query(Project).filter(Project.user_id == current_user.id)
    if status:
        q = q.filter(Project.status == status)
    return q.order_by(Project.priority.desc()).all()


@router.post("/", response_model=ProjectRead, status_code=201)
def create_project(data: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = Project(user_id=current_user.id, **data.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    db.delete(project)
    db.commit()


@router.post("/{project_id}/allocate", response_model=ProjectRead)
def allocate_savings(
    project_id: int,
    data: ProjectSavingAllocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Alloue une somme d'un compte d'épargne vers un projet."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    saving = db.query(Saving).filter(Saving.id == data.saving_id, Saving.user_id == current_user.id).first()
    if not saving:
        raise HTTPException(status_code=404, detail="Épargne introuvable")
    if saving.current_amount < data.amount:
        raise HTTPException(status_code=400, detail="Solde insuffisant dans ce compte d'épargne")

    saving.current_amount -= data.amount
    project.saved_amount += data.amount

    allocation = ProjectSavingAllocation(project_id=project_id, saving_id=data.saving_id, amount=data.amount, note=data.note)
    db.add(allocation)
    db.commit()
    db.refresh(project)
    return project


@router.post("/{project_id}/simulate")
def simulate_project_ai(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lance une simulation IA pour estimer quand l'objectif sera atteint."""
    from sqlalchemy import func, extract
    from app.services.ai_analyst import simulate_project
    from app.models.transaction import Transaction
    from datetime import date

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projet introuvable")

    now = date.today()
    monthly_income = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount > 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0

    monthly_expenses = abs(db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id,
        Transaction.amount < 0,
        extract("month", Transaction.transaction_date) == now.month,
        extract("year", Transaction.transaction_date) == now.year,
    ).scalar() or 0.0)

    simulation = simulate_project(
        project_name=project.name,
        target_amount=project.target_amount,
        saved_amount=project.saved_amount,
        monthly_income=monthly_income,
        monthly_expenses=monthly_expenses,
        monthly_contribution=project.monthly_contribution,
    )

    project.ai_simulation = simulation
    db.commit()
    return simulation
