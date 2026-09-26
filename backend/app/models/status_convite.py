from enum import Enum


class StatusConvite(Enum):
    PENDENTE = "pendente"
    ACEITO = "aceito"
    RECUSADO = "recusado"
    CANCELADO = "cancelado"


class TransicaoInvalidaError(Exception):
    """O convite não está num estado que permita essa ação (ex.: aceitar algo já recusado)."""


class PermissaoNegadaError(Exception):
    """O usuário não tem o papel necessário para essa ação (ex.: remetente tentando aceitar)."""
