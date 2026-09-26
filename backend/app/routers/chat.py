from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.usuario import Usuario
from app.repositories.perfil_repository import PerfilRepository
from app.repositories.usuario_repository import UsuarioRepository
from app.schemas.schemas import ChatCabecalhoResponse, MensagemRequest, MensagemResponse
from app.services.chat_service import (
    ChatService,
    MatchInativoError,
    MatchNaoEncontradoError,
    UsuarioNaoParticipaDoMatchError,
)

router = APIRouter(prefix="/chat", tags=["chat"])
_chat = ChatService()
_usuarios = UsuarioRepository()
_perfis = PerfilRepository()


@router.get("/{match_id}", response_model=ChatCabecalhoResponse)
def obter_cabecalho(match_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        match = _chat.obter_cabecalho(match_id, usuario.id)
    except MatchNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UsuarioNaoParticipaDoMatchError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    outro_id = match.outro_usuario(usuario.id)
    outro = _usuarios.buscar_por_id(outro_id)
    perfil_outro = _perfis.buscar_por_usuario(outro_id)
    return {
        "match_id": match.id,
        "ativo": match.ativo,
        "outro": {
            "id": outro.id,
            "nome": outro.nome,
            "foto_url": perfil_outro.foto_url if perfil_outro else None,
        },
    }


@router.get("/{match_id}/mensagens", response_model=list[MensagemResponse])
def listar_mensagens(match_id: int, apos_id: int | None = None, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        mensagens = _chat.listar_mensagens(match_id, usuario.id, apos_id=apos_id)
    except MatchNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UsuarioNaoParticipaDoMatchError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return [m.to_dict() for m in mensagens]


@router.post("/{match_id}/mensagens", response_model=MensagemResponse, status_code=status.HTTP_201_CREATED)
def enviar_mensagem(match_id: int, dados: MensagemRequest, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        mensagem = _chat.enviar_mensagem(match_id, usuario.id, dados.texto)
    except MatchNaoEncontradoError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except UsuarioNaoParticipaDoMatchError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except MatchInativoError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    return mensagem.to_dict()
