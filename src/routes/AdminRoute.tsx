
import {Navigate, Outlet} from "react-router-dom";
import {useAtomValue} from "jotai";
import {userAtom} from "../store/auth.ts";

export default function AdminRoute() {
    const auth = useAtomValue(userAtom);

    // 아직 초기화 전이면 로딩 처리
    if (auth === undefined) {
        return <div>Loading...</div>;
    }

    // 관리자 아니면 차단
    if (!auth || auth.role !== "ROLE_ADMIN") {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}