from app.database import get_cursor


class CurtidaPostRepository:
    def curtir(self, post_id: int, usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "INSERT IGNORE INTO curtidas_post (post_id, usuario_id) VALUES (%s, %s)",
                (post_id, usuario_id),
            )

    def descurtir(self, post_id: int, usuario_id: int) -> None:
        with get_cursor(commit=True) as cur:
            cur.execute(
                "DELETE FROM curtidas_post WHERE post_id = %s AND usuario_id = %s",
                (post_id, usuario_id),
            )

    def contar(self, post_id: int) -> int:
        with get_cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM curtidas_post WHERE post_id = %s", (post_id,))
            return cur.fetchone()["total"]
