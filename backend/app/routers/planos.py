from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.plano import Plano
from app.models.usuario import Usuario
from app.schemas.schemas import AssinarPlanoRequest, PlanoAtualResponse, PlanoResponse
from app.services.plano_service import PlanoInvalidoError, PlanoService

router = APIRouter(prefix="/planos", tags=["planos"])
_planos = PlanoService()

CHAVES_PLANOS = ["gratis", "gold", "diamond"]


def _assinatura_para_resposta(plano: Plano, assinatura) -> dict:
    return {
        "plano": plano.to_dict(),
        "ativa": assinatura.ativa() if assinatura else True,
        "expira_em": assinatura.expira_em if assinatura else None,
        "dias_restantes": assinatura.dias_restantes() if assinatura else None,
        "cartao_final": assinatura.cartao_final if assinatura else None,
        "cartao_bandeira": assinatura.cartao_bandeira if assinatura else None,
    }


@router.get("", response_model=list[PlanoResponse])
def listar_planos():
    return [Plano.por_chave(chave).to_dict() for chave in CHAVES_PLANOS]


@router.get("/me", response_model=PlanoAtualResponse)
def meu_plano(usuario: Usuario = Depends(get_usuario_atual)):
    assinatura = _planos.assinatura_ativa(usuario.id)
    plano = assinatura.plano if assinatura else Plano.por_chave("gratis")
    return _assinatura_para_resposta(plano, assinatura)


@router.post("/assinar", response_model=PlanoAtualResponse, status_code=status.HTTP_201_CREATED)
def assinar_plano(dados: AssinarPlanoRequest, usuario: Usuario = Depends(get_usuario_atual)):
    try:
        assinatura = _planos.assinar(usuario.id, dados.plano, dados.cartao_final, dados.cartao_bandeira)
    except PlanoInvalidoError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return _assinatura_para_resposta(assinatura.plano, assinatura)


@router.post("/cancelar", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_plano(usuario: Usuario = Depends(get_usuario_atual)):
    _planos.cancelar(usuario.id)
