import { http } from '@/utils/http'
import { env } from '@/config'
import type { ISubmitFeedbackParams } from '../types'

const helpFeedbackService = {
  submitFeedback(params: ISubmitFeedbackParams) {
    return http
      .post(`${env.HOST_API_URL}/api/discountExpert/feedback`, params)
      .then(res => res.data)
  },
}

export default helpFeedbackService
