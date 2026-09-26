from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.lucia import MensagemLucia
from app.models.usuario import Usuario
from app.schemas.schemas import LuciaAtalhoRequest, LuciaMensagemRequest, LuciaRespostaResponse
from app.services.lucia_service import MAXIMO_HISTORICO, LuciaService

router = APIRouter(prefix="/lucia", tags=["lucia"])
# uma instância só: o limite de mensagens por minuto fica guardado nela
_lucia = LuciaService()


@router.post("/mensagens", response_model=LuciaRespostaResponse)
def enviar_mensagem(dados: LuciaMensagemRequest, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        historico = [MensagemLucia(m.papel, m.conteudo) for m in dados.historico[-MAXIMO_HISTORICO:]]
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    texto = dados.texto.strip()
    if not texto:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A mensagem não pode ser vazia")
    return _lucia.responder(usuario.id, historico, texto).to_dict()


@router.get("/atalhos", response_model=list[str])
def listar_atalhos(usuario: Usuario = Depends(get_usuario_atual)):
    return _lucia.atalhos()


@router.post("/atalhos", response_model=LuciaRespostaResponse)
def responder_atalho(dados: LuciaAtalhoRequest, usuario: Usuario = Depends(get_usuario_atual)):
    return _lucia.responder_atalho(dados.rotulo).to_dict()
