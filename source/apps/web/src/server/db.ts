import 'server-only';

import { getDbClient } from '@on-education/db';

/** Acesso ao banco do lado servidor (RSC / server actions). Lazy: exige DATABASE_URL. */
export const db = () => getDbClient();
