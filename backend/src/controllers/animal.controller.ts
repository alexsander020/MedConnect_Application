import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { featureFlags } from '../config/featureFlags';
import { validarPesoGramas, ESPECIES_ANIMAIS } from '@medconnect/validation';
import { AnimalSpecies } from '@prisma/client';

export class AnimalController {
  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!featureFlags.VET_ENABLED) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Funcionalidade veterinária não habilitada' } });
        return;
      }

      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas tutores (pacientes) podem cadastrar animais' } });
        return;
      }

      const { name, species, breed, weightGrams, birthDate, isFoodProducing, notes } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Nome do animal é obrigatório' } });
        return;
      }

      if (!species || !ESPECIES_ANIMAIS.includes(species)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Espécie inválida. Espécies permitidas: ${ESPECIES_ANIMAIS.join(', ')}`
          }
        });
        return;
      }

      if (!validarPesoGramas(weightGrams)) {
        res.status(400).json({
          error: {
            code: 'INVALID_WEIGHT',
            message: 'Peso deve ser um número inteiro em gramas entre 10 g e 1.500.000 g'
          }
        });
        return;
      }

      let parsedBirthDate: Date | null = null;
      if (birthDate) {
        const d = new Date(birthDate);
        if (isNaN(d.getTime()) || d > new Date()) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data de nascimento inválida ou no futuro' } });
          return;
        }
        parsedBirthDate = d;
      }

      const animal = await prisma.animal.create({
        data: {
          tutorId: req.user.id,
          name: name.trim(),
          species: species as AnimalSpecies,
          breed: breed ? String(breed).trim() : null,
          weightGrams: Number(weightGrams),
          birthDate: parsedBirthDate,
          isFoodProducing: Boolean(isFoodProducing),
          notes: notes ? String(notes).trim() : null
        }
      });

      res.status(201).json(animal);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao cadastrar animal' } });
    }
  }

  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!featureFlags.VET_ENABLED) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Funcionalidade veterinária não habilitada' } });
        return;
      }

      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas tutores podem listar seus animais' } });
        return;
      }

      const animals = await prisma.animal.findMany({
        where: {
          tutorId: req.user.id,
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json(animals);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao listar animais' } });
    }
  }

  async getById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!featureFlags.VET_ENABLED) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Funcionalidade veterinária não habilitada' } });
        return;
      }

      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas tutores podem consultar seus animais' } });
        return;
      }

      const { id } = req.params;

      // Validação estrita de IDOR: se pertencer a outro tutor, retorna 404 sem vazar existência
      const animal = await prisma.animal.findFirst({
        where: {
          id: id as string,
          tutorId: req.user.id,
          deletedAt: null
        }
      });

      if (!animal) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Animal não encontrado' } });
        return;
      }

      res.json(animal);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao consultar animal' } });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!featureFlags.VET_ENABLED) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Funcionalidade veterinária não habilitada' } });
        return;
      }

      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas tutores podem atualizar seus animais' } });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.animal.findFirst({
        where: {
          id: id as string,
          tutorId: req.user.id,
          deletedAt: null
        }
      });

      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Animal não encontrado' } });
        return;
      }

      const { name, species, breed, weightGrams, birthDate, isFoodProducing, notes } = req.body;

      const dataToUpdate: any = {};

      if (name !== undefined) {
        if (!name || typeof name !== 'string' || !name.trim()) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Nome não pode ser vazio' } });
          return;
        }
        dataToUpdate.name = name.trim();
      }

      if (species !== undefined) {
        if (!ESPECIES_ANIMAIS.includes(species)) {
          res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Espécie inválida' } });
          return;
        }
        dataToUpdate.species = species as AnimalSpecies;
      }

      if (weightGrams !== undefined) {
        if (!validarPesoGramas(weightGrams)) {
          res.status(400).json({ error: { code: 'INVALID_WEIGHT', message: 'Peso em gramas inválido' } });
          return;
        }
        dataToUpdate.weightGrams = Number(weightGrams);
      }

      if (breed !== undefined) {
        dataToUpdate.breed = breed ? String(breed).trim() : null;
      }

      if (birthDate !== undefined) {
        if (birthDate === null) {
          dataToUpdate.birthDate = null;
        } else {
          const d = new Date(birthDate);
          if (isNaN(d.getTime()) || d > new Date()) {
            res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Data de nascimento inválida' } });
            return;
          }
          dataToUpdate.birthDate = d;
        }
      }

      if (isFoodProducing !== undefined) {
        dataToUpdate.isFoodProducing = Boolean(isFoodProducing);
      }

      if (notes !== undefined) {
        dataToUpdate.notes = notes ? String(notes).trim() : null;
      }

      const updated = await prisma.animal.update({
        where: { id: id as string },
        data: dataToUpdate
      });

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao atualizar animal' } });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!featureFlags.VET_ENABLED) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Funcionalidade veterinária não habilitada' } });
        return;
      }

      if (!req.user || req.user.role !== 'PATIENT') {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Apenas tutores podem remover seus animais' } });
        return;
      }

      const { id } = req.params;

      const existing = await prisma.animal.findFirst({
        where: {
          id: id as string,
          tutorId: req.user.id,
          deletedAt: null
        }
      });

      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Animal não encontrado' } });
        return;
      }

      // Exclusão lógica
      await prisma.animal.update({
        where: { id: id as string },
        data: { deletedAt: new Date() }
      });

      res.status(200).json({ message: 'Animal removido com sucesso' });
    } catch (error) {
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro ao remover animal' } });
    }
  }
}
