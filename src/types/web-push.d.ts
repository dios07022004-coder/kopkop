declare module "web-push" {
  export interface PushSubscriptionShape {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }
  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
  export function setVapidDetails(subject: string, publicKey: string, privateKey: string): void;
  export function sendNotification(
    subscription: PushSubscriptionShape,
    payload?: string | Buffer,
    options?: Record<string, unknown>,
  ): Promise<{ statusCode: number }>;
  const _default: {
    generateVAPIDKeys: typeof generateVAPIDKeys;
    setVapidDetails: typeof setVapidDetails;
    sendNotification: typeof sendNotification;
  };
  export default _default;
}
