from datetime import datetime

from app.models.convite_treino import validar_data_futura
from app.models.status_convite import PermissaoNegadaError, StatusConvite, TransicaoInvalidaError

MINIMO_MEMBROS = 1
MAXIMO_MEMBROS = 4


class MembroSessao:
    """Convidado de uma sessão de grupo; segue as mesmas regras de transição do convite 1 a 1."""

    def __init__(self, usuario_id: int, status: StatusConvite | str = StatusConvite.PENDENTE,
                 respondido_em: datetime | None = None, sessao_id: int | None = None):
        self._sessao_id = sessao_id
        self._usuario_id = usuario_id
        self._status = StatusConvite(status)
        self._respondido_em = respondido_em

    @property
    def sessao_id(self) -> int | None:
        return self._sessao_id

    @property
    def usuario_id(self) -> int:
        return self._usuario_id

    @property
    def status(self) -> StatusConvite:
        return self._status

    @property
    def respondido_em(self) -> datetime | None:
        return self._respondido_em

    def _responder(self, usuario_id: int, novo: StatusConvite) -> None:
        if usuario_id != self._usuario_id:
            raise PermissaoNegadaError("Só o próprio convidado pode responder")
        if self._status != StatusConvite.PENDENTE:
            raise TransicaoInvalidaError(f"Você já respondeu: {self._status.value}")
        self._status = novo
        self._respondido_em = datetime.now()

    def aceitar(self, usuario_id: int) -> None:
        self._responder(usuario_id, StatusConvite.ACEITO)

    def recusar(self, usuario_id: int) -> None:
        self._responder(usuario_id, StatusConvite.RECUSADO)


class SessaoGrupo:
    def __init__(self, id: int | None, criador_id: int, academia_id: int, agendada_para: datetime,
                 membros: list[MembroSessao], descricao: str | None = None,
                 criado_em: datetime | None = None):
        if id is None:
            validar_data_futura(agendada_para)
            self._validar_membros(criador_id, membros)
        self._id = id
        self._criador_id = criador_id
        self._academia_id = academia_id
        self._agendada_para = agendada_para
        self.descricao = descricao
        self._membros = list(membros)
        self._criado_em = criado_em or datetime.now()

    @staticmethod
    def _validar_membros(criador_id: int, membros: list[MembroSessao]) -> None:
        ids = [m.usuario_id for m in membros]
        if not MINIMO_MEMBROS <= len(ids) <= MAXIMO_MEMBROS:
            raise ValueError(f"Escolha de {MINIMO_MEMBROS} a {MAXIMO_MEMBROS} pessoas para o grupo")
        if len(set(ids)) != len(ids):
            raise ValueError("A mesma pessoa não pode ser convidada duas vezes")
        if criador_id in ids:
            raise ValueError("O criador não entra na lista de convidados")

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def criador_id(self) -> int:
        return self._criador_id

    @property
    def academia_id(self) -> int:
        return self._academia_id

    @property
    def agendada_para(self) -> datetime:
        return self._agendada_para

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    def membros(self) -> list[MembroSessao]:
        return list(self._membros)

    @property
    def descricao(self) -> str | None:
        return self._descricao

    @descricao.setter
    def descricao(self, valor: str | None):
        limpo = (valor or "").strip() or None
        if limpo and len(limpo) > 120:
            raise ValueError("A descrição deve ter no máximo 120 caracteres")
        self._descricao = limpo

    def membro(self, usuario_id: int) -> MembroSessao | None:
        return next((m for m in self._membros if m.usuario_id == usuario_id), None)

    def confirmados(self) -> list[MembroSessao]:
        return [m for m in self._membros if m.status == StatusConvite.ACEITO]

    def total_pessoas(self) -> int:
        return len(self._membros) + 1

    def status_de(self, usuario_id: int) -> StatusConvite | None:
        """None para o criador (ou para quem não participa)."""
        membro = self.membro(usuario_id)
        return membro.status if membro else None

    def pode_cancelar(self, usuario_id: int) -> bool:
        return usuario_id == self._criador_id

    def participa(self, usuario_id: int) -> bool:
        return usuario_id == self._criador_id or self.membro(usuario_id) is not None

    def eh_passada(self, agora: datetime | None = None) -> bool:
        return self._agendada_para <= (agora or datetime.now())
