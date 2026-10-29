/*
  Warnings:

  - You are about to drop the column `createdAt` on the `usuario` table. All the data in the column will be lost.
  - Added the required column `atualizadoEm` to the `Usuario` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senhaHash` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usuario` DROP COLUMN `createdAt`,
    ADD COLUMN `atualizadoEm` DATETIME(3) NOT NULL,
    ADD COLUMN `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `perfil` ENUM('SOLICITANTE', 'TECNICO', 'ADMIN') NOT NULL DEFAULT 'SOLICITANTE',
    ADD COLUMN `senhaHash` VARCHAR(255) NOT NULL,
    MODIFY `email` VARCHAR(191) NOT NULL;

-- CreateTable
CREATE TABLE `TipoProblema` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(100) NOT NULL,
    `descricao` TEXT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `TipoProblema_nome_key`(`nome`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Chamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(150) NOT NULL,
    `descricao` TEXT NOT NULL,
    `status` ENUM('ABERTO', 'EM_ATENDIMENTO', 'PENDENTE', 'RESOLVIDO', 'FECHADO', 'CANCELADO') NOT NULL DEFAULT 'ABERTO',
    `prioridade` ENUM('BAIXA', 'MEDIA', 'ALTA', 'URGENTE') NOT NULL DEFAULT 'MEDIA',
    `solicitanteId` INTEGER NOT NULL,
    `tecnicoId` INTEGER NULL,
    `tipoProblemaId` INTEGER NOT NULL,
    `motivoCancelamento` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,
    `resolvidoEm` DATETIME(3) NULL,
    `fechadoEm` DATETIME(3) NULL,

    INDEX `Chamado_status_idx`(`status`),
    INDEX `Chamado_prioridade_idx`(`prioridade`),
    INDEX `Chamado_criadoEm_idx`(`criadoEm`),
    INDEX `Chamado_tecnicoId_status_idx`(`tecnicoId`, `status`),
    INDEX `Chamado_solicitanteId_idx`(`solicitanteId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comentario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conteudo` TEXT NOT NULL,
    `chamadoId` INTEGER NOT NULL,
    `autorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Comentario_chamadoId_criadoEm_idx`(`chamadoId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HistoricoChamado` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `acao` VARCHAR(100) NOT NULL,
    `detalhes` TEXT NULL,
    `chamadoId` INTEGER NOT NULL,
    `usuarioId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HistoricoChamado_chamadoId_criadoEm_idx`(`chamadoId`, `criadoEm`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notificacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` VARCHAR(60) NOT NULL,
    `mensagem` TEXT NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `usuarioId` INTEGER NOT NULL,
    `chamadoId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notificacao_usuarioId_lida_idx`(`usuarioId`, `lida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_tecnicoId_fkey` FOREIGN KEY (`tecnicoId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Chamado` ADD CONSTRAINT `Chamado_tipoProblemaId_fkey` FOREIGN KEY (`tipoProblemaId`) REFERENCES `TipoProblema`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comentario` ADD CONSTRAINT `Comentario_chamadoId_fkey` FOREIGN KEY (`chamadoId`) REFERENCES `Chamado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Comentario` ADD CONSTRAINT `Comentario_autorId_fkey` FOREIGN KEY (`autorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoChamado` ADD CONSTRAINT `HistoricoChamado_chamadoId_fkey` FOREIGN KEY (`chamadoId`) REFERENCES `Chamado`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HistoricoChamado` ADD CONSTRAINT `HistoricoChamado_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notificacao` ADD CONSTRAINT `Notificacao_chamadoId_fkey` FOREIGN KEY (`chamadoId`) REFERENCES `Chamado`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
