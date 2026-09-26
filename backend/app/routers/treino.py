from contextlib import contextmanager

from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_usuario_atual
from app.models.dia_semana import DiaSemana
from app.models.status_convite import PermissaoNegadaError, TransicaoInvalidaError
from app.models.usuario import Usuario
from app.schemas.schemas import (
    CheckInRequest,
    CheckInResponse,
    ConviteTreinoRequest,
    ConviteTreinoResponse,
    DescricaoDiaRequest,
    DiaTreinoResponse,
    ExercicioRequest,
    ExercicioResponse,
    PendentesResponse,
    SessaoGrupoRequest,
    SessaoGrupoResponse,
    TreinoResponse,
)
from app.services.checkin_service import CheckInService
from app.services.convite_treino_service import (
    AcademiaNaoEncontradaError,
    AgendamentoNaoEncontradoError,
    ConviteDuplicadoError,
    ConviteTreinoService,
    NaoEhMatchError,
)
from app.services.feed_service import SemAcademiaError
from app.services.plano_treino_service import (
    ExercicioNaoEncontradoError,
    LimiteExerciciosError,
    PlanoTreinoService,
)
from app.services.sessao_grupo_service import SessaoGrupoService
from app.services.treino_service import TreinoService

router = APIRouter(prefix="/treino", tags=["treino"])
_treino = TreinoService()
_planos = PlanoTreinoService()
_checkins = CheckInService()
_convites = ConviteTreinoService()
_sessoes = SessaoGrupoService()

_STATUS_POR_ERRO = [
    (PermissaoNegadaError, status.HTTP_403_FORBIDDEN),
    (NaoEhMatchError, status.HTTP_403_FORBIDDEN),
    (AgendamentoNaoEncontradoError, status.HTTP_404_NOT_FOUND),
    (ExercicioNaoEncontradoError, status.HTTP_404_NOT_FOUND),
    (AcademiaNaoEncontradaError, status.HTTP_404_NOT_FOUND),
    (TransicaoInvalidaError, status.HTTP_409_CONFLICT),
    (ConviteDuplicadoError, status.HTTP_409_CONFLICT),
    (LimiteExerciciosError, status.HTTP_400_BAD_REQUEST),
    (SemAcademiaError, status.HTTP_400_BAD_REQUEST),
    (ValueError, status.HTTP_422_UNPROCESSABLE_ENTITY),
]


@contextmanager
def _erros_de_dominio_para_http():
    try:
        yield
    except tuple(erro for erro, _ in _STATUS_POR_ERRO) as e:
        codigo = next(c for erro, c in _STATUS_POR_ERRO if isinstance(e, erro))
        raise HTTPException(status_code=codigo, detail=str(e))


def _convite_do_usuario(usuario_id: int, convite_id: int) -> dict:
    return next(c for c in _convites.listar(usuario_id) if c["id"] == convite_id)


# ---------- painel ----------
@router.get("", response_model=TreinoResponse)
def painel(usuario: Usuario = Depends(get_usuario_atual)):
    return _treino.painel(usuario)


@router.get("/pendentes", response_model=PendentesResponse)
def pendentes(usuario: Usuario = Depends(get_usuario_atual)):
    return {"quantidade": _treino.contar_pendentes(usuario.id)}


# ---------- plano da semana / exercícios ----------
@router.put("/plano/{dia}", response_model=DiaTreinoResponse)
def salvar_descricao(dia: DiaSemana, dados: DescricaoDiaRequest, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        return _planos.salvar_descricao(usuario.id, dia, dados.descricao).to_dict()


@router.post("/exercicios", response_model=ExercicioResponse, status_code=status.HTTP_201_CREATED)
def adicionar_exercicio(dados: ExercicioRequest, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        exercicio = _planos.adicionar_exercicio(usuario.id, DiaSemana(dados.dia), dados.nome,
                                                dados.series, dados.reps)
    return exercicio.to_dict()


@router.delete("/exercicios/{exercicio_id}", status_code=status.HTTP_204_NO_CONTENT)
def remover_exercicio(exercicio_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _planos.remover_exercicio(usuario.id, exercicio_id)


# ---------- check-in ----------
@router.post("/checkin", response_model=CheckInResponse)
def fazer_checkin(dados: CheckInRequest, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        return _checkins.fazer(usuario, dados.publicar_no_feed).to_dict()


@router.delete("/checkin", status_code=status.HTTP_204_NO_CONTENT)
def sair_checkin(usuario: Usuario = Depends(get_usuario_atual)):
    _checkins.sair(usuario)


# ---------- convites 1 a 1 ----------
@router.post("/convites", response_model=ConviteTreinoResponse, status_code=status.HTTP_201_CREATED)
def enviar_convite(dados: ConviteTreinoRequest, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        convite = _convites.enviar(usuario, dados.destinatario_id, dados.agendado_para, dados.academia_id)
    return _convite_do_usuario(usuario.id, convite.id)


@router.post("/convites/{convite_id}/aceitar", response_model=ConviteTreinoResponse)
def aceitar_convite(convite_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _convites.responder(usuario, convite_id, aceitar=True)
    return _convite_do_usuario(usuario.id, convite_id)


@router.post("/convites/{convite_id}/recusar", response_model=ConviteTreinoResponse)
def recusar_convite(convite_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _convites.responder(usuario, convite_id, aceitar=False)
    return _convite_do_usuario(usuario.id, convite_id)


@router.post("/convites/{convite_id}/cancelar", response_model=ConviteTreinoResponse)
def cancelar_convite(convite_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _convites.cancelar(usuario, convite_id)
    return _convite_do_usuario(usuario.id, convite_id)


# ---------- grupos ----------
@router.post("/sessoes", response_model=SessaoGrupoResponse, status_code=status.HTTP_201_CREATED)
def criar_sessao(dados: SessaoGrupoRequest, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        sessao = _sessoes.criar(usuario, dados.membros_ids, dados.agendada_para,
                                dados.academia_id, dados.descricao)
    return next(s for s in _sessoes.listar(usuario.id) if s["id"] == sessao.id)


@router.post("/sessoes/{sessao_id}/aceitar", status_code=status.HTTP_204_NO_CONTENT)
def aceitar_sessao(sessao_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _sessoes.responder(usuario, sessao_id, aceitar=True)


@router.post("/sessoes/{sessao_id}/recusar", status_code=status.HTTP_204_NO_CONTENT)
def recusar_sessao(sessao_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _sessoes.responder(usuario, sessao_id, aceitar=False)


@router.delete("/sessoes/{sessao_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancelar_sessao(sessao_id: int, usuario: Usuario = Depends(get_usuario_atual)):
    with _erros_de_dominio_para_http():
        _sessoes.cancelar(usuario, sessao_id)
