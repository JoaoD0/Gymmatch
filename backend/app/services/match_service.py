from app.repositories.match_repository import MatchRepository
from app.repositories.mensagem_repository import MensagemRepository
from app.repositories.perfil_repository import PerfilRepository
from app.repositories.usuario_repository import UsuarioRepository


class MatchService:
    """Monta a lista de matches com os dados que a tela precisa, sem N+1."""

    def __init__(self, match_repository: MatchRepository | None = None,
                 usuario_repository: UsuarioRepository | None = None,
                 perfil_repository: PerfilRepository | None = None,
                 mensagem_repository: MensagemRepository | None = None):
        self._matches = match_repository or MatchRepository()
        self._usuarios = usuario_repository or UsuarioRepository()
        self._perfis = perfil_repository or PerfilRepository()
        self._mensagens = mensagem_repository or MensagemRepository()

    def contatos_ativos(self, usuario_id: int) -> list[dict]:
        """Pessoas com quem o usuário tem match ativo e nenhum bloqueio (para convidar a treinar)."""
        return [
            {
                "id": linha["id"],
                "nome": linha["nome"],
                "foto_url": linha["foto_url"],
                "academia": {"id": linha["academia_id"], "nome": linha["academia_nome"]}
                if linha["academia_id"] else None,
            }
            for linha in self._matches.listar_contatos_ativos(usuario_id)
        ]

    def ids_contatos_ativos(self, usuario_id: int) -> set[int]:
        return {linha["id"] for linha in self._matches.listar_contatos_ativos(usuario_id)}

    def listar_para_usuario(self, usuario_id: int) -> list[dict]:
        matches = self._matches.listar_por_usuario(usuario_id)
        if not matches:
            return []

        outro_ids = [m.outro_usuario(usuario_id) for m in matches]
        usuarios_outros = {u.id: u for u in self._usuarios.buscar_varios_por_id(outro_ids)}
        perfis_outros = {p.usuario_id: p for p in self._perfis.buscar_varios_por_usuario(outro_ids)}
        meu_perfil = self._perfis.buscar_por_usuario(usuario_id)
        ultimas_mensagens = self._mensagens.buscar_ultimas_por_matches([m.id for m in matches])

        resultado = []
        for match in matches:
            outro_id = match.outro_usuario(usuario_id)
            outro = usuarios_outros.get(outro_id)
            if not outro:
                continue

            perfil_outro = perfis_outros.get(outro_id)
            ultima = ultimas_mensagens.get(match.id)
            modalidades_comuns = (
                meu_perfil.modalidades_em_comum(perfil_outro) if meu_perfil and perfil_outro else []
            )

            resultado.append({
                "id": match.id,
                "criado_em": match.criado_em,
                "outro": {
                    "id": outro.id,
                    "nome": outro.nome,
                    "foto_url": perfil_outro.foto_url if perfil_outro else None,
                    "idade": perfil_outro.idade if perfil_outro else None,
                },
                "ultima_mensagem": {
                    "texto": ultima.texto,
                    "remetente_id": ultima.remetente_id,
                    "criado_em": ultima.criado_em,
                } if ultima else None,
                "nova": ultima is None,
                "modalidades_em_comum": modalidades_comuns,
            })
        return resultado
