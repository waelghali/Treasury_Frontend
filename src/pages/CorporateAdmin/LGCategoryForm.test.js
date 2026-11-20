import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import LGCategoryForm from './LGCategoryForm';
import { apiRequest } from 'services/apiService.js';

global.IS_REACT_ACT_ENVIRONMENT = true;

const mockNavigate = jest.fn();
let mockParams = {};

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

jest.mock('services/apiService.js', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  Save: () => null,
  Loader2: () => <span data-testid="icon-loader" />,
}));

function mountForm(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const paint = root.render.bind(root);
  act(() => {
    paint(element);
  });
  return {
    container,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    },
  };
}

describe('LGCategoryForm', () => {
  let mounted = null;
  const origAlert = window.alert;

  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    window.alert = jest.fn();
    apiRequest.mockImplementation((url, method) => {
      if (url === '/corporate-admin/customer-entities/' && method === 'GET') {
        return Promise.resolve([
          { id: 101, entity_name: 'Alpha HQ', code: 'HQ' },
          { id: 102, entity_name: 'Alpha Branch', code: 'BR' },
        ]);
      }
      return Promise.resolve({ id: 55 });
    });
  });

  afterEach(() => {
    window.alert = origAlert;
    if (mounted) {
      mounted.unmount();
      mounted = null;
    }
  });

  async function fillAndSubmitEntityRestricted(container) {
    // Allow async entity fetch useEffect to settle
    await act(async () => {
      await Promise.resolve();
    });

    const nameInput = container.querySelector('#name');
    const codeInput = container.querySelector('#code');
    const allEntitiesCheckbox = container.querySelector('#has_all_entity_access');

    act(() => {
      Simulate.change(nameInput, {
        target: { name: 'name', value: 'Trade Finance', type: 'text' },
      });
      Simulate.change(codeInput, {
        target: { name: 'code', value: 'tf', type: 'text' },
      });
      Simulate.change(allEntitiesCheckbox, {
        target: { name: 'has_all_entity_access', type: 'checkbox', checked: false },
      });
    });

    const entityCheckbox = container.querySelector('#entity-101');
    expect(entityCheckbox).not.toBeNull();
    act(() => {
      Simulate.change(entityCheckbox, {
        target: { value: '101', checked: true, type: 'checkbox' },
      });
    });

    const form = container.querySelector('form');
    await act(async () => {
      Simulate.submit(form);
      await Promise.resolve();
    });
  }

  test('preserves entity restrictions when userRole="corporate-admin"', async () => {
    mounted = mountForm(
      <LGCategoryForm onLogout={jest.fn()} isGracePeriod={false} userRole="corporate-admin" />
    );

    await fillAndSubmitEntityRestricted(mounted.container);

    expect(apiRequest).toHaveBeenCalledWith(
      '/corporate-admin/lg-categories',
      'POST',
      expect.objectContaining({
        name: 'Trade Finance',
        code: 'TF',
        has_all_entity_access: false,
        entity_ids: [101],
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/corporate-admin/lg-categories');
  });

  test('preserves entity restrictions even when userRole prop is omitted', async () => {
    mounted = mountForm(
      <LGCategoryForm onLogout={jest.fn()} isGracePeriod={false} />
    );

    await fillAndSubmitEntityRestricted(mounted.container);

    expect(apiRequest).toHaveBeenCalledWith(
      '/corporate-admin/lg-categories',
      'POST',
      expect.objectContaining({
        has_all_entity_access: false,
        entity_ids: [101],
      })
    );
  });

  test('forces universal access and posts to system-owner endpoint when userRole="system-owner"', async () => {
    mounted = mountForm(
      <LGCategoryForm onLogout={jest.fn()} isGracePeriod={false} userRole="system-owner" />
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(apiRequest).not.toHaveBeenCalledWith('/corporate-admin/customer-entities/', 'GET');
    expect(mounted.container.querySelector('#has_all_entity_access')).toBeNull();

    const nameInput = mounted.container.querySelector('#name');
    const codeInput = mounted.container.querySelector('#code');
    const form = mounted.container.querySelector('form');

    act(() => {
      Simulate.change(nameInput, {
        target: { name: 'name', value: 'Universal Guarantee', type: 'text' },
      });
      Simulate.change(codeInput, {
        target: { name: 'code', value: 'ug', type: 'text' },
      });
    });

    await act(async () => {
      Simulate.submit(form);
      await Promise.resolve();
    });

    expect(apiRequest).toHaveBeenCalledWith(
      '/system-owner/lg-categories/universal',
      'POST',
      expect.objectContaining({
        name: 'Universal Guarantee',
        code: 'UG',
        has_all_entity_access: true,
        entity_ids: [],
      })
    );
    expect(mockNavigate).toHaveBeenCalledWith('/system-owner/lg-categories/universal');
  });
});
