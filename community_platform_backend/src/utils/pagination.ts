import { Request } from "express";

export const getPagination = (req: Request) => {
    const page = req.query.page ? Math.max(1, Number(req.query.page)) : 1;
    const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 10;
    const search=req.query.search || ""
    const skip = (page - 1) * limit;
    return { page, limit, skip ,search};
};