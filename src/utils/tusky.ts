import { Tusky } from "@tusky-io/ts-sdk/web";

const apiKey = import.meta.env.VITE_TUSKY_API_KEY;

if (!apiKey) {
    throw new Error("VITE_TUSKY_API_KEY is not defined");
}

const tusky = new Tusky({ apiKey });

export default tusky;
