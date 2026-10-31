
import asyncio
import json

import websockets


WS_URL = "ws://127.0.0.1:8001/ws/orders/"


async def main():
    try:
        async with websockets.connect(
            WS_URL,
            open_timeout=5,
        ) as websocket:
            print("PASS: WebSocket connected.")

            print("Waiting up to 30 seconds for an order event...")

            try:
                message = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=30,
                )
            except asyncio.TimeoutError:
                print("FAIL: No order event received within 30 seconds.")
                return

            event = json.loads(message)

            print("Received event:", json.dumps(event, indent=2))

            if event.get("event") in (
                "order.created",
                "order.updated",
            ):
                print("PASS: Valid order event received.")
            else:
                print("FAIL: Unexpected event type.")

    except Exception as error:
        print(f"FAIL: WebSocket test failed: {error}")


if __name__ == "__main__":
    asyncio.run(main())
