from datetime import datetime

from app.models.status_convite import PermissaoNegadaError, StatusConvite, TransicaoInvalidaError


def validar_data_futura(data_hora: datetime) -> None:
    if data_hora < datetime.now():
        raise ValueError("A data do treino não pode estar no passado")


class ConviteTreino:
    """Convite 1 a 1 para treinar. O status é uma máquina de estados: só muda pelos métodos."""

    def __init__(self, id: int | None, remetente_id: int, destinatario_id: int, academia_id: int,
                 agendado_para: datetime, status: StatusConvite | str = StatusConvite.PENDENTE,
                 criado_em: datetime | None = None, respondido_em: datetime | None = None):
        if remetente_id == destinatario_id:
            raise ValueError("Não é possível convidar a si mesmo")
        # só convites novos precisam ser futuros; os já gravados podem ter ficado no passado
        if id is None:
            validar_data_futura(agendado_para)
        self._id = id
        self._remetente_id = remetente_id
        self._destinatario_id = destinatario_id
        self._academia_id = academia_id
        self._agendado_para = agendado_para
        self._status = StatusConvite(status)
        self._criado_em = criado_em or datetime.now()
        self._respondido_em = respondido_em

    @property
    def id(self) -> int | None:
        return self._id

    @property
    def remetente_id(self) -> int:
        return self._remetente_id

    @property
    def destinatario_id(self) -> int:
        return self._destinatario_id

    @property
    def academia_id(self) -> int:
        return self._academia_id

    @property
    def agendado_para(self) -> datetime:
        return self._agendado_para

    @property
    def status(self) -> StatusConvite:
        return self._status

    @property
    def criado_em(self) -> datetime:
        return self._criado_em

    @property
    def respondido_em(self) -> datetime | None:
        return self._respondido_em

    # ---------- transições ----------
    def _mudar_status(self, novo: StatusConvite) -> None:
        if self._status != StatusConvite.PENDENTE:
            raise TransicaoInvalidaError(f"O convite já está {self._status.value}")
        self._status = novo
        self._respondido_em = datetime.now()

    def aceitar(self, usuario_id: int) -> None:
        if usuario_id != self._destinatario_id:
            raise PermissaoNegadaError("Só quem recebeu o convite pode aceitá-lo")
        self._mudar_status(StatusConvite.ACEITO)

    def recusar(self, usuario_id: int) -> None:
        if usuario_id != self._destinatario_id:
            raise PermissaoNegadaError("Só quem recebeu o convite pode recusá-lo")
        self._mudar_status(StatusConvite.RECUSADO)

    def cancelar(self, usuario_id: int) -> None:
        if usuario_id != self._remetente_id:
            raise PermissaoNegadaError("Só quem enviou o convite pode cancelá-lo")
        self._mudar_status(StatusConvite.CANCELADO)

    # ---------- consultas ----------
    def eh_passado(self, agora: datetime | None = None) -> bool:
        return self._agendado_para <= (agora or datetime.now())

    def envolve(self, usuario_id: int) -> bool:
        return usuario_id in (self._remetente_id, self._destinatario_id)

    def outro_participante(self, usuario_id: int) -> int:
        if usuario_id == self._remetente_id:
            return self._destinatario_id
        if usuario_id == self._destinatario_id:
            return self._remetente_id
        raise PermissaoNegadaError("Usuário não participa deste convite")
