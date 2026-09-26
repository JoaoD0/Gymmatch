from app.database import get_cursor
from app.models.match import Match


class MatchRepository:
    @staticmethod
    def _linha_para_match(linha: dict) -> Match:
        return Match(
            id=linha["id"],
            usuario1_id=linha["usuario1_id"],
            usuario2_id=linha["usuario2_id"],
            ativo=bool(linha["ativo"]),
            criado_em=linha["criado_em"],
        )

    def criar(self, usuario_a: int, usuario_b: int) -> Match:
        u1, u2 = sorted((usuario_a, usuario_b))
        with get_cursor(commit=True) as cur:
            cur.execute(
                """INSERT IGNORE INTO matches (usuario1_id, usuario2_id) VALUES (%s, %s)""",
                (u1, u2),
            )
        return self.buscar_entre(u1, u2)

    def buscar_entre(self, usuario_a: int, usuario_b: int) -> Match | None:
        u1, u2 = sorted((usuario_a, usuario_b))
        with get_cursor() as cur:
            cur.execute(
                "SELECT * FROM matches WHERE usuario1_id = %s AND usuario2_id = %s",
                (u1, u2),
            )
            linha = cur.fetchone()
        return self._linha_para_match(linha) if linha else None

    def buscar_por_id(self, match_id: int) -> Match | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM matches WHERE id = %s", (match_id,))
            linha = cur.fetchone()
        return self._linha_para_match(linha) if linha else None

    def deletar_entre(self, usuario_a: int, usuario_b: int) -> None:
        u1, u2 = sorted((usuario_a, usuario_b))
        with get_cursor(commit=True) as cur:
            cur.execute(
                "DELETE FROM matches WHERE usuario1_id = %s AND usuario2_id = %s",
                (u1, u2),
            )

    def listar_por_usuario(self, usuario_id: int) -> list[Match]:
        """Só matches ativos — usado também para contar o limite de matches do plano."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT * FROM matches
                   WHERE (usuario1_id = %s OR usuario2_id = %s) AND ativo = TRUE
                   ORDER BY criado_em DESC""",
                (usuario_id, usuario_id),
            )
            linhas = cur.fetchall()
        return [self._linha_para_match(l) for l in linhas]

    def listar_contatos_ativos(self, usuario_id: int) -> list[dict]:
        """Outra pessoa de cada match ativo (nome, foto e academia), sem quem tem bloqueio. Uma query."""
        with get_cursor() as cur:
            cur.execute(
                """SELECT o.id, o.nome, p.foto_url, a.id AS academia_id, a.nome AS academia_nome
                   FROM matches m
                   JOIN usuarios o ON o.id = IF(m.usuario1_id = %s, m.usuario2_id, m.usuario1_id)
                   LEFT JOIN perfis p ON p.usuario_id = o.id
                   LEFT JOIN academias a ON a.id = o.academia_id
                   WHERE (m.usuario1_id = %s OR m.usuario2_id = %s) AND m.ativo = TRUE
                     AND NOT EXISTS (
                         SELECT 1 FROM bloqueios b
                         WHERE (b.bloqueador_id = %s AND b.bloqueado_id = o.id)
                            OR (b.bloqueador_id = o.id AND b.bloqueado_id = %s))
                   ORDER BY o.nome""",
                (usuario_id, usuario_id, usuario_id, usuario_id, usuario_id),
            )
            return cur.fetchall()

    def encerrar(self, match_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("UPDATE matches SET ativo = FALSE WHERE id = %s", (match_id,))
