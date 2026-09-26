from fastapi import APIRouter, Depends, status

from app.deps import get_usuario_atual
from app.models.academia import Academia
from app.models.usuario import Usuario
from app.repositories.academia_repository import AcademiaRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.schemas import AcademiaRequest, AcademiaResponse

router = APIRouter(prefix="/academias", tags=["academias"])
_academias = AcademiaRepository()
_usuarios = UsuarioRepository()


@router.get("", response_model=list[AcademiaResponse])
def listar_academias():
    return [a.to_dict() for a in _academias.listar()]


@router.post("", response_model=AcademiaResponse, status_code=status.HTTP_201_CREATED)
def criar_academia(dados: AcademiaRequest, usuario: Usuario = Depends(get_usuario_atual)):
    academia = Academia(id=None, nome=dados.nome, endereco=dados.endereco)
    _academias.criar(academia)
    return academia.to_dict()


@router.post("/{academia_id}/entrar", response_model=AcademiaResponse)
def entrar_na_academia(academia_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    _usuarios.atualizar_academia(usuario.id, academia_id)
    return _academias.buscar_por_id(academia_id).to_dict()
