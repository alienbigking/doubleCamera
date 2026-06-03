export type { RouteConfig, RouteName } from './types'

import { homeRoutes } from '@/pages/home/routes'
import { loginRoutes } from '@/pages/login/routes'

export const routes = [...homeRoutes, ...loginRoutes]
