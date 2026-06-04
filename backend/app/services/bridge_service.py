import logging
import httpx
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)


class BridgeService:
    """
    Wrapper pour Bridge API (DSP2 Open Banking).
    Docs: https://docs.bridgeapi.io
    """

    def _base_url(self) -> str:
        url = settings.BRIDGE_API_URL
        return url if url.endswith("/") else url + "/"

    def _headers(self, extra: dict | None = None) -> dict:
        h = {
            "Client-Id": settings.BRIDGE_CLIENT_ID,
            "Client-Secret": settings.BRIDGE_CLIENT_SECRET,
            "Bridge-Version": "2025-01-15",
            "Content-Type": "application/json",
        }
        if extra:
            h.update(extra)
        return h

    def _client(self, extra_headers: dict | None = None) -> httpx.Client:
        base = self._base_url()
        logger.info("Bridge _client base_url=%s client_id_set=%s client_secret_set=%s",
                     base,
                     bool(settings.BRIDGE_CLIENT_ID),
                     bool(settings.BRIDGE_CLIENT_SECRET))
        return httpx.Client(base_url=base, headers=self._headers(extra_headers), timeout=30)

    def get_connect_url(self, user_uuid: str, user_email: str, callback_url: str) -> str:
        """Crée une session Connect Bridge et retourne l'URL de redirection."""
        logger.info("Bridge get_connect_url user_uuid=%s", user_uuid)
        access_token = self.get_user_access_token(user_uuid)
        with self._client({"Authorization": f"Bearer {access_token}"}) as client:
            resp = client.post("aggregation/connect-sessions", json={
                "user_email": user_email,
                "callback_url": callback_url,
            })
            logger.info("Bridge get_connect_url → status=%s body=%.500s", resp.status_code, resp.text)
            resp.raise_for_status()
            return resp.json()["url"]

    def create_bridge_user(self, external_user_id: str) -> dict:
        logger.info("Bridge create_bridge_user external_user_id=%s", external_user_id)
        with self._client() as client:
            resp = client.post("aggregation/users", json={"external_user_id": external_user_id})
            logger.info("Bridge create_bridge_user → status=%s body=%.500s", resp.status_code, resp.text)
            resp.raise_for_status()
            return resp.json()

    def list_accounts(self, user_access_token: str) -> list[dict]:
        with self._client({"Authorization": f"Bearer {user_access_token}"}) as client:
            resp = client.get("aggregation/accounts")
            resp.raise_for_status()
            return resp.json().get("resources", [])

    def list_transactions(
        self,
        user_access_token: str,
        account_id: int | None = None,
        since: datetime | None = None,
        limit: int = 100,
    ) -> list[dict]:
        params: dict = {"limit": min(limit, 500)}
        if account_id:
            params["account_id"] = account_id
        if since:
            params["since"] = since.strftime("%Y-%m-%dT%H:%M:%S.000Z")

        transactions: list[dict] = []
        next_url: str | None = "aggregation/transactions"

        with self._client({"Authorization": f"Bearer {user_access_token}"}) as client:
            while next_url and len(transactions) < limit:
                resp = client.get(next_url, params=params)
                resp.raise_for_status()
                data = resp.json()
                transactions.extend(data.get("resources", []))
                next_url = data.get("pagination", {}).get("next_uri")
                params = {}

        return transactions[:limit]

    def get_item(self, access_token: str, item_id: str | int) -> dict:
        """Récupère les détails d'un item Bridge par son ID numérique."""
        with self._client({"Authorization": f"Bearer {access_token}"}) as client:
            resp = client.get(f"aggregation/items/{item_id}")
            logger.info("Bridge get_item/%s → status=%s body=%.500s", item_id, resp.status_code, resp.text)
            resp.raise_for_status()
            return resp.json()
        with self._client() as client:
            resp = client.post("aggregation/authorization/token", json={"user_uuid": bridge_user_uuid})
            resp.raise_for_status()
            return resp.json()["access_token"]

    def get_item_by_uuid(self, bridge_user_uuid: str, item_uuid: str) -> dict:
        user_access_token = self.get_user_access_token(bridge_user_uuid)
        with self._client({"Authorization": f"Bearer {user_access_token}"}) as client:
            resp = client.get(f"aggregation/items/{item_uuid}")
            resp.raise_for_status()
            return resp.json()

    def refresh_item(self, user_access_token: str, item_id: int) -> dict:
        with self._client({"Authorization": f"Bearer {user_access_token}"}) as client:
            resp = client.post(f"aggregation/items/{item_id}/refresh")
            resp.raise_for_status()
            return resp.json()


bridge_service = BridgeService()
