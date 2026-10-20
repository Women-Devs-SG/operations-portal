import { json } from '../../lib/http.mjs';

export default function handler() {
  return json(404, { status: 'error', message: 'API endpoint not found.' });
}
