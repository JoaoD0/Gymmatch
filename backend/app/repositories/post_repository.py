from app.database import get_cursor
from app.models.post import Post


class PostRepository:
    @staticmethod
    def _linha_para_post(linha: dict) -> Post:
        return Post.criar(
            linha["tipo"],
            id=linha["id"],
            autor_id=linha["autor_id"],
            academia_id=linha["academia_id"],
            texto=linha["texto"],
            foto_url=linha["foto_url"],
            criado_em=linha["criado_em"],
        )

    def criar(self, post: Post) -> Post:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT INTO posts (autor_id, academia_id, tipo, texto, foto_url) VALUES (%s, %s, %s, %s, %s)",
                (post.autor_id, post.academia_id, post.tipo, post.texto, post.foto_url),
            )
            post._id = cur.lastrowid
        return post

    def buscar_por_id(self, post_id: int) -> Post | None:
        with get_cursor() as cur:
            cur.execute("SELECT * FROM posts WHERE id = %s", (post_id,))
            linha = cur.fetchone()
        return self._linha_para_post(linha) if linha else None

    def deletar(self, post_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute("DELETE FROM posts WHERE id = %s", (post_id,))

    def listar_da_academia(self, academia_id: int, usuario_id: int, antes_de_id: int | None = None,
                            limite: int = 20) -> tuple[list[dict], bool]:
        """Uma única query: post + autor (nome/foto) + curtidas_total + curtido_por_mim,
        excluindo autores bloqueados em qualquer direção. Busca limite+1 pra saber se tem_mais."""
        filtro_cursor = "AND p.id < %s" if antes_de_id is not None else ""
        params = [usuario_id, academia_id, usuario_id, usuario_id]
        if antes_de_id is not None:
            params.append(antes_de_id)
        params.append(limite + 1)

        with get_cursor() as cur:
            cur.execute(
                f"""SELECT p.*, u.nome AS autor_nome, pf.foto_url AS autor_foto_url,
                           (SELECT COUNT(*) FROM curtidas_post cp WHERE cp.post_id = p.id) AS curtidas_total,
                           EXISTS(
                               SELECT 1 FROM curtidas_post cp2
                               WHERE cp2.post_id = p.id AND cp2.usuario_id = %s
                           ) AS curtido_por_mim
                    FROM posts p
                    INNER JOIN usuarios u ON u.id = p.autor_id
                    LEFT JOIN perfis pf ON pf.usuario_id = p.autor_id
                    WHERE p.academia_id = %s
                      AND NOT EXISTS (
                          SELECT 1 FROM bloqueios b
                          WHERE (b.bloqueador_id = %s AND b.bloqueado_id = p.autor_id)
                             OR (b.bloqueador_id = p.autor_id AND b.bloqueado_id = %s)
                      )
                      {filtro_cursor}
                    ORDER BY p.id DESC
                    LIMIT %s""",
                tuple(params),
            )
            linhas = cur.fetchall()

        tem_mais = len(linhas) > limite
        return linhas[:limite], tem_mais

    def contar_novos(self, academia_id: int, usuario_id: int, depois_de_id: int) -> int:
        with get_cursor() as cur:
            cur.execute(
                """SELECT COUNT(*) AS total FROM posts p
                   WHERE p.academia_id = %s AND p.id > %s
                     AND NOT EXISTS (
                         SELECT 1 FROM bloqueios b
                         WHERE (b.bloqueador_id = %s AND b.bloqueado_id = p.autor_id)
                            OR (b.bloqueador_id = p.autor_id AND b.bloqueado_id = %s)
                     )""",
                (academia_id, depois_de_id, usuario_id, usuario_id),
            )
            return cur.fetchone()["total"]
