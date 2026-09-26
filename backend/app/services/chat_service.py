from app.models.match import Match
from app.models.mensagem import Mensagem
from app.repositories.match_repository import MatchRepository
from app.repositories.mensagem_repository import MensagemRepository


class MatchNaoEncontradoError(Exception):
    pass


class UsuarioNaoParticipaDoMatchError(Exception):
    pass


class MatchInativoError(Exception):
    pass


class ChatService:
    def __init__(self, match_repository: MatchRepository | None = None,
                 mensagem_repository: MensagemRepository | None = None):
        self._matches = match_repository or MatchRepository()
        self._mensagens = mensagem_repository or MensagemRepository()

    def _garantir_participante(self, match_id: int, usuario_id: int, exigir_ativo: bool = True) -> Match:
        match = self._matches.buscar_por_id(match_id)
        if not match:
            raise MatchNaoEncontradoError(f"Match {match_id} não encontrado")
        if not match.envolve(usuario_id):
            raise UsuarioNaoParticipaDoMatchError("Usuário não faz parte deste match")
        if exigir_ativo and not match.ativo:
            raise MatchInativoError("Este match foi encerrado")
        return match

    def obter_cabecalho(self, match_id: int, usuario_id: int) -> Match:
        """Não exige match ativo — o cabeçalho precisa exibir 'Match encerrado' quando for o caso."""
        return self._garantir_participante(match_id, usuario_id, exigir_ativo=False)

    def enviar_mensagem(self, match_id: int, remetente_id: int, texto: str) -> Mensagem:
        self._garantir_participante(match_id, remetente_id)
        mensagem = Mensagem(id=None, match_id=match_id, remetente_id=remetente_id, texto=texto)
        return self._mensagens.criar(mensagem)

    def listar_mensagens(self, match_id: int, usuario_id: int, apos_id: int | None = None) -> list[Mensagem]:
        self._garantir_participante(match_id, usuario_id, exigir_ativo=False)
        return self._mensagens.listar_por_match(match_id, apos_id=apos_id)
