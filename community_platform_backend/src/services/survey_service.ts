import { prisma } from "../config/prisma";
import { USER_OMIT_PASSWORD_SELECT } from "../types/user";

export const getSurveys = async (skip: number, limit: number, community_id?: string) => {
  const where: any = {};
  if (community_id) where.community_id = community_id;

  return await prisma.survey.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      questions: { orderBy: { order: "asc" } },
      _count: {
        select: { responses: true },
      },
    },
  });
};

export const countSurveys = async (community_id?: string) => {
  const where: any = {};
  if (community_id) where.community_id = community_id;
  return await prisma.survey.count({ where });
};

export const getSurveyById = async (id: string) => {
  return await prisma.survey.findUnique({
    where: { id },
    include: {
      creator: { select: USER_OMIT_PASSWORD_SELECT },
      questions: { orderBy: { order: "asc" } },
      _count: {
        select: { responses: true },
      },
    },
  });
};

export const createSurvey = async (data: {
  community_id?: string;
  creator_id: string;
  title: string;
  description?: string;
  expires_at?: Date;
  questions: {
    question_text: string;
    question_type?: string;
    options?: any;
    is_required?: boolean;
    order?: number;
  }[];
}) => {
  return await prisma.survey.create({
    data: {
      community_id: data.community_id,
      creator_id: data.creator_id,
      title: data.title,
      description: data.description,
      expires_at: data.expires_at,
      questions: {
        create: data.questions.map((q, index) => ({
          question_text: q.question_text,
          question_type: q.question_type || "text",
          options: q.options || null,
          is_required: q.is_required ?? true,
          order: q.order ?? index,
        })),
      },
    },
    include: {
      questions: true,
      creator: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const updateSurvey = async (id: string, data: { title?: string; description?: string; is_closed?: boolean; expires_at?: Date }) => {
  return await prisma.survey.update({
    where: { id },
    data,
    include: {
      questions: true,
    },
  });
};

export const deleteSurvey = async (id: string) => {
  return await prisma.survey.delete({ where: { id } });
};

// Survey Responses
export const getSurveyResponses = async (survey_id: string, skip: number, limit: number) => {
  return await prisma.surveyResponse.findMany({
    where: { survey_id },
    skip,
    take: limit,
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const countSurveyResponses = async (survey_id: string) => {
  return await prisma.surveyResponse.count({ where: { survey_id } });
};

export const submitSurveyResponse = async (survey_id: string, user_id: string, answers: any) => {
  const survey = await prisma.survey.findUnique({ where: { id: survey_id } });
  if (!survey) throw new Error("Survey not found");
  if (survey.is_closed || (survey.expires_at && survey.expires_at < new Date())) {
    throw new Error("Survey is closed or expired");
  }

  return await prisma.surveyResponse.upsert({
    where: {
      survey_id_user_id: { survey_id, user_id },
    },
    update: {
      answers,
      submitted_at: new Date(),
    },
    create: {
      survey_id,
      user_id,
      answers,
    },
    include: {
      user: { select: USER_OMIT_PASSWORD_SELECT },
    },
  });
};

export const deleteSurveyResponse = async (survey_id: string, user_id?: string, response_id?: string) => {
  const where: any = { survey_id };
  if (response_id) where.id = response_id;
  if (user_id) where.user_id = user_id;

  return await prisma.surveyResponse.deleteMany({ where });
};
