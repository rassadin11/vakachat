import { client } from "./client";

export const paymentsApi = {
    create: (amount: number) =>
        client.post<{ confirmationUrl: string }>("/payments/create", { amount }),
};
