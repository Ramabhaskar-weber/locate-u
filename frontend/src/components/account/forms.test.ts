import { saveSchema, parseTags } from '../location/SaveDialog';
import { loginSchema, registerSchema } from './AccountPanel';

describe('form validation', () => {
  it('validates registration like the backend does', () => {
    expect(registerSchema.safeParse({ display_name: 'Asha', email: 'a@b.co', password: 'travel123' }).success).toBe(true);
    expect(registerSchema.safeParse({ display_name: 'Asha', email: 'a@b.co', password: '12345678' }).success).toBe(false);
    expect(registerSchema.safeParse({ display_name: '', email: 'nope', password: 'short' }).success).toBe(false);
    expect(loginSchema.safeParse({ email: 'x@y.in', password: 'p' }).success).toBe(true);
  });
  it('validates saved-place forms and tags', () => {
    expect(saveSchema.safeParse({ name: '  ', color: '#ffffff' }).success).toBe(false);
    expect(saveSchema.safeParse({ name: 'Ok', color: 'red' }).success).toBe(false);
    expect(parseTags('beach, sunset, , beach')).toEqual(['beach', 'sunset']);
  });
});
