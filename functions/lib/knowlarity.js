"use strict";
// import axios, { AxiosRequestConfig } from "axios";
Object.defineProperty(exports, "__esModule", { value: true });
// const KPI_CALL_URL = "https://kpi.knowlarity.com{channel}/v1/call/";
const handleKnowlarityCall = async (req) => {
    // setTimeout(() => {
    //     balanceHelper(req);
    // }, 100);
};
// const balanceHelper = async (req: any) => {
//     const params: AxiosRequestConfig<any> = {
//         data: {
//             body: {
//                 start_time: req["start_time"],
//                 end_time: Date.now(),
//                 agent_number: req["agent_number"],
//                 customer_number: req["customer_number"],
//             },
//             head: {},
//         },
//     };
//     try {
//         let log_data = await axios.get(KPI_CALL_URL, params);
//         console.log(log_data);
//     } catch (e) {
//         console.log(e);
//     }
// };
exports.default = handleKnowlarityCall;
//# sourceMappingURL=knowlarity.js.map