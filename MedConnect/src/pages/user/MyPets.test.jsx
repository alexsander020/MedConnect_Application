/**
 * @jest-environment jsdom
 */
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import MyPets from './MyPets';
import { api } from '../../services/api';
import { renderPage, routeGet } from './test-utils';

jest.mock('../../services/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn(), defaults: { baseURL: 'http://localhost:3000/api' } },
  getSocket: jest.fn(() => ({ connect: jest.fn(), disconnect: jest.fn(), on: jest.fn(), off: jest.fn(), emit: jest.fn() })),
}));

const VET_ON = { vetEnabled: true, vetAllowFoodProducing: false, vetControlledEnabled: false };
const REX = { id: 'pet-1', name: 'Rex', species: 'DOG', breed: 'Golden Retriever', weightGrams: 28500, isFoodProducing: false };

function renderMyPets() {
  return renderPage(
    <Routes>
      <Route path="/my-pets" element={<MyPets />} />
      <Route path="/dashboard" element={<div>Dashboard Principal</div>} />
    </Routes>,
    { route: '/my-pets' }
  );
}

describe('MyPets (cadastro de animais do tutor)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redireciona para o início quando a vertical veterinária está desligada', async () => {
    routeGet(api, { '/config': { vetEnabled: false } });
    renderMyPets();
    expect(await screen.findByText('Dashboard Principal')).toBeInTheDocument();
    expect(screen.queryByText('Animais cadastrados')).toBeNull();
  });

  it('mostra erro com opção de tentar novamente quando a lista falha', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': new Error('falhou') });
    renderMyPets();
    expect(await screen.findByText(/Não foi possível carregar a lista de pets/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tentar novamente/i })).toBeInTheDocument();
  });

  it('lista os pets com espécie, raça e peso em kg', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [REX] });
    renderMyPets();
    const card = await screen.findByRole('article', { name: 'Rex' });
    expect(within(card).getByText(/Cão · Golden Retriever/)).toBeInTheDocument();
    expect(within(card).getByText('28,5 kg')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Animais cadastrados' })).toBeInTheDocument();
  });

  it('mostra o estado vazio sem pets cadastrados', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [] });
    renderMyPets();
    expect(await screen.findByText('Nenhum pet cadastrado')).toBeInTheDocument();
  });

  it('bloqueia animal destinado à produção de alimentos quando a flag não permite', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [] });
    renderMyPets();
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar pet/i }));
    expect(await screen.findByRole('heading', { name: 'Novo animal' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Nome do animal/i), { target: { value: 'Boiadeiro' } });
    fireEvent.change(screen.getByLabelText(/Peso em kg/i), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /destinado à produção ou alimentação humana/i }));

    expect(await screen.findByText(/Aviso regulatório:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Salvar pet/i })).toBeDisabled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('valida nome e peso antes de salvar', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [] });
    renderMyPets();
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar pet/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Salvar pet/i }));

    expect(await screen.findByText('Informe o nome do animal.')).toBeInTheDocument();
    expect(screen.getByText(/Informe o peso em kg/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('cadastra o pet convertendo kg (com vírgula) para gramas', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [] });
    api.post.mockResolvedValueOnce({ data: { id: 'pet-new', name: 'Pipoca', species: 'CAT', weightGrams: 4200 } });
    renderMyPets();
    fireEvent.click(await screen.findByRole('button', { name: /Cadastrar pet/i }));
    await screen.findByRole('heading', { name: 'Novo animal' });

    fireEvent.change(screen.getByLabelText(/Nome do animal/i), { target: { value: 'Pipoca' } });
    fireEvent.change(screen.getByLabelText(/Espécie/i), { target: { value: 'CAT' } });
    fireEvent.change(screen.getByLabelText(/Raça/i), { target: { value: 'Siamês' } });
    fireEvent.change(screen.getByLabelText(/Peso em kg/i), { target: { value: '4,2' } });
    fireEvent.change(screen.getByLabelText(/Observações de saúde/i), { target: { value: 'Alérgico a corante' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar pet/i }));

    await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
    expect(api.post).toHaveBeenCalledWith(
      '/animals',
      expect.objectContaining({ name: 'Pipoca', species: 'CAT', breed: 'Siamês', weightGrams: 4200, isFoodProducing: false, notes: 'Alérgico a corante' })
    );
  });

  it('edita um pet existente com os dados preenchidos', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [REX] });
    api.patch.mockResolvedValueOnce({ data: { ...REX, weightGrams: 30000 } });
    renderMyPets();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Rex' }));
    expect(await screen.findByRole('heading', { name: 'Editar animal' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do animal/i)).toHaveValue('Rex');
    expect(screen.getByLabelText(/Peso em kg/i)).toHaveValue('28,5');

    fireEvent.change(screen.getByLabelText(/Peso em kg/i), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar alterações/i }));

    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/animals/pet-1', expect.objectContaining({ name: 'Rex', weightGrams: 30000 })));
  });

  it('remove o pet após confirmação', async () => {
    routeGet(api, { '/config': VET_ON, '/animals': [REX] });
    api.delete.mockResolvedValueOnce({ data: {} });
    renderMyPets();
    fireEvent.click(await screen.findByRole('button', { name: 'Remover Rex' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Remover Rex?')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Remover' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/animals/pet-1'));
  });
});
