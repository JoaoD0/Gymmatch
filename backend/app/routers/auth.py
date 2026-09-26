from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_auth_service, get_usuario_atual
from app.models.usuario import Usuario
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.schemas import (
    AlterarSenhaRequest,
    AtualizarNomeRequest,
    AtualizarStatusRequest,
    CadastroRequest,
    LoginRequest,
    LoginResponse,
    UsuarioResponse,
)
from app.services.auth_service import (
    AuthService,
    CredenciaisInvalidasError,
    EmailJaCadastradoError,
    SenhaAtualIncorretaError,
)

router = APIRouter(prefix="/auth", tags=["auth"])
_usuarios = UsuarioRepository()


@router.post("/cadastro", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def cadastrar(dados: CadastroRequest, auth_service: AuthService = Depends(get_auth_service)):
    try:
        usuario = auth_service.cadastrar(dados.nome, dados.email, dados.senha, dados.academia_id)
    except EmailJaCadastradoError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return usuario.to_dict()


@router.post("/login", response_model=LoginResponse)
def login(dados: LoginRequest, auth_service: AuthService = Depends(get_auth_service)):
    try:
        usuario, token = auth_service.login(dados.email, dados.senha)
    except CredenciaisInvalidasError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    return {"usuario": usuario.to_dict(), "token": token}


@router.put("/me", response_model=UsuarioResponse)
def atualizar_meu_nome(dados: AtualizarNomeRequest, usuario: Usuario = Depends(get_usuario_atual)):
    _usuarios.atualizar_nome(usuario.id, dados.nome)
    usuario_atualizado = _usuarios.buscar_por_id(usuario.id)
    return usuario_atualizado.to_dict()


@router.put("/me/status", response_model=UsuarioResponse)
def atualizar_meu_status(dados: AtualizarStatusRequest, usuario: Usuario = Depends(get_usuario_atual)):
    if dados.status not in ("ativo", "pausado"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status inválido")
    _usuarios.atualizar_status(usuario.id, dados.status)
    usuario_atualizado = _usuarios.buscar_por_id(usuario.id)
    return usuario_atualizado.to_dict()


@router.put("/me/senha", status_code=status.HTTP_204_NO_CONTENT)
def alterar_minha_senha(dados: AlterarSenhaRequest, usuario: Usuario = Depends(get_usuario_atual),
                         auth_service: AuthService = Depends(get_auth_service)):
    try:
        auth_service.trocar_senha(usuario, dados.senha_atual, dados.nova_senha)
    except SenhaAtualIncorretaError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def excluir_minha_conta(usuario: Usuario = Depends(get_usuario_atual),
                         auth_service: AuthService = Depends(get_auth_service)):
    auth_service.deletar_conta(usuario)
