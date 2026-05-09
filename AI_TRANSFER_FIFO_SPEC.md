# Especificación para implementar traspasos de fondos con coste fiscal FIFO (España)

## 1. Objetivo

Implementar traspasos entre fondos de inversión de forma fiscalmente correcta para España:

1. El traspaso no genera plusvalía realizada en el momento del traspaso.
2. El coste fiscal se arrastra desde el fondo origen al fondo destino.
3. El cálculo de plusvalías futuras en el destino debe cuadrar con el FIFO fiscal del banco.

## 2. Problema actual detectado

Actualmente, en transferencias:

1. El lote destino se crea con precio e importe de operación del destino.
2. El coste base de la transacción de traspaso usa importes operativos de la orden.
3. El frontend calcula PnL de lotes con ese coste operativo.
   Resultado: la rentabilidad y los detalles FIFO no coinciden con el extracto fiscal del banco.

Código relevante:

1. Lógica de transferencia: BACKEND/src/services/portfolio/portfolio.service.ts
2. Tipos backend: BACKEND/src/interfaces/portfolio.interface.ts
3. Validación zod: BACKEND/src/validation/schemas.ts
4. Resumen de inversión backend: BACKEND/src/services/portfolio/portfolio-mapper.service.ts
5. PnL por lote frontend: FRONTEND/src/app/utils/lot-utils.service.ts

## 3. Modelo de datos deseado

### 3.1 Regla principal

1. En ILot, costPerUnit y totalCost deben representar SIEMPRE coste fiscal.
2. Los valores de operación de traspaso deben guardarse en campos separados, nunca mezclados con coste fiscal.

### 3.2 Cambios en ILot

Actualizar tipo ILot en BACKEND/src/interfaces/portfolio.interface.ts:

1. Mantener:

- costPerUnit como coste fiscal unitario.
- totalCost como coste fiscal total remanente.

2. Añadir campos opcionales para trazabilidad operativa:

- transferDate opcional.
- sourceIsin opcional.
- sourceLotId opcional.
- operationPricePerUnit opcional.
- operationAmount opcional.
- isTransfer opcional booleano.

### 3.3 Cambios en ITransaction

Actualizar ITransaction en BACKEND/src/interfaces/portfolio.interface.ts:

1. Mantener costBasis como coste fiscal de la operación.
2. Añadir operationAmount opcional.
3. Añadir operationPricePerUnit opcional.
4. Añadir transferBreakdown opcional con desglose por tramo fiscal.

### 3.4 Cambios en ITransferData

Actualizar ITransferData en BACKEND/src/interfaces/portfolio.interface.ts:

1. Mantener sourceQtySold, targetQtyReceived, sourcePricePerUnit, targetPricePerUnit.
2. Renombrar campos de importes operativos para evitar confusión:

- sourceAmountSold -> sourceOperationAmount
- targetAmountReceived -> targetOperationAmount

3. Si hay riesgo de romper compatibilidad API, aceptar ambos temporalmente y deprecar los antiguos.

## 4. Reglas de cálculo fiscal para transferencias

### 4.1 Consumo FIFO en origen

1. Consumir lotes del origen por orden FIFO usando qtyRemaining.
2. Para cada tramo consumido:

- consumedQty
- sourceLot.costPerUnit fiscal
- consumedFiscalCost = consumedQty por sourceLot.costPerUnit

3. Reducir qtyRemaining del lote origen.
4. Recalcular totalCost del lote origen como qtyRemaining por costPerUnit.

### 4.2 Coste fiscal total transferido

1. totalFiscalCost = suma de consumedFiscalCost de todos los tramos consumidos.
2. Este totalFiscalCost debe ser el costBasis tanto de transfer_out como de transfer_in.
3. realizedPnl en transfer_out y transfer_in debe ser 0.

### 4.3 Construcción de lotes en destino

Si se consumen múltiples lotes origen, crear múltiples lotes destino (uno por tramo fiscal):

1. ratioTramo = consumedQtyTramo dividido por sourceQtySold.
2. targetQtyTramo = targetQtyReceived por ratioTramo.
3. Reconciliar redondeo:

- Redondear cantidades con la misma precisión usada por tu sistema.
- En el último tramo, ajustar targetQtyTramo para que la suma total sea exactamente targetQtyReceived.

4. costPerUnit fiscal del tramo destino = consumedFiscalCostTramo dividido por targetQtyTramo.
5. totalCost fiscal del tramo destino = consumedFiscalCostTramo.
6. createdDate del lote destino debe heredar la fecha fiscal del lote origen (source lot createdDate).
7. Guardar transferDate con fecha de ejecución del traspaso.

### 4.4 Campos operativos (solo informativos)

Para cada tramo destino:

1. operationAmountTramo proporcional a targetQtyTramo respecto a targetQtyReceived.
2. operationPricePerUnit puede mantenerse como el VL de entrada reportado por la orden.
3. Estos campos no deben usarse en cálculo fiscal de PnL.

## 5. Reglas de UI y métricas

### 5.1 Lista de lotes

1. Mostrar como principal:

- Inversión = totalCost fiscal.
- Precio medio = costPerUnit fiscal.

2. Si isTransfer es true, mostrar además datos operativos en tooltip o detalle:

- operationPricePerUnit
- operationAmount

### 5.2 Resumen del fondo

1. Total invertido del fondo basado en suma de costes fiscales de lotes activos.
2. PnL no realizado basado en valor mercado menos coste fiscal.
3. Opcional: mostrar ajuste informativo

- Ajuste diferimiento = suma importes operativos de transfer_in menos suma coste fiscal transferido.

## 6. Validación y casuísticas obligatorias

### 6.1 Validaciones funcionales

1. sourceIsin y targetIsin no pueden ser iguales.
2. sourceQtySold y targetQtyReceived deben ser positivos.
3. Debe existir liquidez suficiente en origen.
4. Si sourceOperationAmount y targetOperationAmount difieren ligeramente, permitir por tolerancia configurable.
5. No permitir IDs de transacción duplicados.

### 6.2 Precisión y redondeos

1. Usar SafeMath en todos los cálculos monetarios y de participaciones.
2. Definir una estrategia única de redondeo para qty y EUR.
3. Reconciliar siempre el último tramo para evitar drift acumulado.

### 6.3 Compatibilidad hacia atrás

1. Leer datos antiguos que no tengan campos nuevos sin romper.
2. Si un lote de transferencia no tiene campos operativos nuevos, seguir operando con fiscal existente.
3. Preparar migración para rehacer lotes transferidos históricos.

## 7. Migración de datos existentes

### 7.1 Objetivo

Recalcular lotes de transfer_in históricos para que reflejen coste fiscal arrastrado.

### 7.2 Estrategia

1. Recorrer transacciones transfer_out del origen.
2. Para cada transfer_out:

- Tomar lotsConsumed con qty y costPerUnit.
- Calcular totalFiscalCost.

3. Buscar transfer_in correspondiente en destino.
4. Repartir targetQtyReceived por tramos proporcionales al consumo origen.
5. Regenerar lotes destino de transferencia con coste fiscal correcto.
6. Marcar/importar campos operativos con valores de orden.
7. Verificar invariantes:

- suma qty tramos destino = qty transfer_in
- suma totalCost tramos destino = totalFiscalCost
- coste fiscal retirado del origen cuadra con coste fiscal creado en destino.

## 8. Limpieza de campos y contratos

1. Eliminar dependencia de sourceAmountSold y targetAmountReceived como base fiscal.
2. Mantenerlos solo como operationAmount.
3. Asegurar que costBasis sea semánticamente fiscal en toda la API.
4. Revisar documentación API para reflejar esta semántica y evitar ambigüedad.

## 9. Tests obligatorios (Vitest)

### 9.1 Unit tests de transferencias (backend)

Crear tests de servicio de portfolio con al menos estos casos:

1. Traspaso simple desde un solo lote origen a destino.
2. Traspaso que consume dos o más lotes origen y crea múltiples tramos en destino.
3. Traspaso con redondeo de participaciones y reconciliación del último tramo.
4. Traspaso no realiza plusvalía en ese momento.
5. Venta posterior en destino usa coste fiscal arrastrado y cuadra con plusvalía esperada.
6. Error por saldo insuficiente.
7. Error por sourceIsin igual a targetIsin.
8. Id de transacción único por operación.

Referencias de estilo de tests existentes:

1. BACKEND/src/services/lot/lot.service.spec.ts
2. BACKEND/src/services/safe-math/safe-math.service.spec.ts

### 9.2 Tests de validación de schema

Actualizar pruebas para TransferSchema en BACKEND/src/validation/schemas.ts:

1. Acepta nuevos campos operation.
2. Rechaza payloads inválidos.
3. Mantiene compatibilidad temporal si se soporta formato antiguo.

### 9.3 Verificación final

Ejecutar suite de tests backend con el script de BACKEND/package.json y añadir cobertura específica de transferencias.

## 10. Criterios de aceptación

1. El coste fiscal de lotes transferidos coincide con FIFO del fondo origen.
2. El frontend muestra inversión y PnL usando base fiscal.
3. Los importes operativos siguen disponibles para auditoría visual.
4. En ejemplos reales del usuario, diferencias tipo 151.07 frente a 149.40 quedan explicadas por campos distintos, no por error de cálculo.
5. Los tests de traspaso cubren casos simples y complejos con aserciones numéricas exactas.

## 11. Entregables mínimos esperados del agente IA

1. Cambios de tipos en backend y frontend para separar campos fiscales y operativos.
2. Refactor de transferBetweenFunds para crear lotes destino por tramos fiscales.
3. Ajustes de validación de schemas.
4. Script de migración para datos históricos.
5. Tests unitarios nuevos de transferencias.
6. Ajuste de UI para mostrar fiscal como principal y operación como secundario.
7. Nota de migración y compatibilidad en changelog o README técnico.
