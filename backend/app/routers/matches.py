from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.usuario import Usuario
from app.repositories.match_repository import MatchRepository
from app.schemas.schemas import DenunciarRequest, MatchResumoResponse
from app.services.match_service import MatchService
from app.services.moderacao_service import ModeracaoService

router = APIRouter(prefix="/matches", tags=["matches"])
_matches_repo = MatchRepository()
_matches = MatchService()
_moderacao = ModeracaoService()


def _match_do_usuario_ou_404(match_id: int, usuario_id: int):
    match = _matches_repo.buscar_por_id(match_id)
    if not match or not match.envolve(usuario_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Match não encontrado")
    return match


@router.get("", response_model=list[MatchResumoResponse])
def listar_meus_matches(usuario: Usuario = Depends(get_usuario_atual)):
    return _matches.listar_para_usuario(usuario.id)


@router.post("/{match_id}/bloquear", status_code=status.HTTP_204_NO_CONTENT)
def bloquear(match_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    match = _match_do_usuario_ou_404(match_id, usuario.id)
    outro_id = match.outro_usuario(usuario.id)
    _moderacao.bloquear(usuario.id, outro_id)


@router.post("/{match_id}/denunciar", status_code=status.HTTP_204_NO_CONTENT)
def denunciar(match_id: int, dados: DenunciarRequest, usuario: Usuario = Depends(get_usuario_atual)):
    match = _match_do_usuario_ou_404(match_id, usuario.id)
    outro_id = match.outro_usuario(usuario.id)
    try:
        _moderacao.denunciar(usuario.id, outro_id, dados.motivo)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
