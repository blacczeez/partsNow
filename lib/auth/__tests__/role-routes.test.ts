import {
  getRoleHomePath,
  getPathArea,
  isPathAllowedForUserType,
  userTypeToArea,
} from '../role-routes';

describe('getRoleHomePath', () => {
  it('sends new users to account setup', () => {
    expect(getRoleHomePath(null, true)).toBe('/account');
    expect(getRoleHomePath(undefined, false)).toBe('/account');
  });

  it('returns role-specific homes', () => {
    expect(getRoleHomePath('admin')).toBe('/admin/dashboard');
    expect(getRoleHomePath('runner')).toBe('/runner/dashboard');
    expect(getRoleHomePath('rider')).toBe('/rider/dashboard');
    expect(getRoleHomePath('car_owner')).toBe('/');
  });
});

describe('getPathArea', () => {
  it('classifies routes by shell', () => {
    expect(getPathArea('/admin/orders')).toBe('admin');
    expect(getPathArea('/runner/dashboard')).toBe('runner');
    expect(getPathArea('/rider/delivery/abc')).toBe('rider');
    expect(getPathArea('/orders')).toBe('customer');
    expect(getPathArea('/')).toBe('customer');
    expect(getPathArea('/verify')).toBe('auth');
    expect(getPathArea('/api/users/me')).toBe(null);
  });
});

describe('isPathAllowedForUserType', () => {
  it('allows each role only in its area', () => {
    expect(isPathAllowedForUserType('/admin/dashboard', 'admin')).toBe(true);
    expect(isPathAllowedForUserType('/', 'admin')).toBe(false);
    expect(isPathAllowedForUserType('/runner/shift', 'runner')).toBe(true);
    expect(isPathAllowedForUserType('/cart', 'runner')).toBe(false);
    expect(isPathAllowedForUserType('/wallet', 'car_owner')).toBe(true);
    expect(isPathAllowedForUserType('/admin/settings', 'car_owner')).toBe(
      false
    );
  });
});

describe('userTypeToArea', () => {
  it('maps mechanics to customer shell', () => {
    expect(userTypeToArea('mechanic')).toBe('customer');
  });
});
