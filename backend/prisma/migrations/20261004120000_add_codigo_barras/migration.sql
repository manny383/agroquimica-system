ALTER TABLE `Producto` ADD COLUMN `codigoBarras` VARCHAR(100) NULL;
CREATE UNIQUE INDEX `Producto_codigoBarras_key` ON `Producto`(`codigoBarras`);
