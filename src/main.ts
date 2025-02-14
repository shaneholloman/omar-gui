import {
  getModelUsage,
  deleteModel,
  formatBytes,
  formatDate,
  sortModels,
  listUnusedModels,
  type ModelUsage,
  type SortColumn,
  type SortDirection
} from "./modelManager";

let modelTableBody: HTMLElement | null;
let currentModels: ModelUsage[] = [];
let currentSort: { column: SortColumn; direction: SortDirection } = {
  column: 'last_used',
  direction: 'desc'
};

async function updateModelList() {
  if (!modelTableBody) {
    console.error('Model table body not found');
    return;
  }

  try {
    console.log('Updating model list...');
    modelTableBody.innerHTML = '<tr><td colspan="5" class="loading">Loading models...</td></tr>';
    currentModels = await getModelUsage();
    console.log('Received models:', currentModels);
    renderModels();
  } catch (error) {
    console.error('Error fetching model usage:', error);
    modelTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="error">Error loading model data: ${error}</td>
      </tr>
    `;
  }
}

function updateSortIndicators() {
  console.log('Updating sort indicators...');
  // Remove all existing sort indicators
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
  });

  // Add sort indicator to current sort column
  const th = document.querySelector(`th[data-sort="${currentSort.column}"]`);
  if (th) {
    th.classList.add(`sort-${currentSort.direction}`);
    console.log('Sort indicator updated:', currentSort);
  } else {
    console.error('Sort header not found:', currentSort.column);
  }
}

function handleSort(column: SortColumn) {
  console.log('Handling sort:', column);
  if (currentSort.column === column) {
    // Toggle direction if clicking the same column
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    // Set new column with default descending order
    currentSort.column = column;
    currentSort.direction = 'desc';
  }

  console.log('New sort state:', currentSort);
  updateSortIndicators();
  renderModels();
}

async function handleDelete(modelName: string) {
  console.log('Handling delete for model:', modelName);

  // Show confirmation dialog
  const confirmModal = document.getElementById('confirm-modal');
  const modelToDeleteSpan = document.getElementById('model-to-delete');

  if (!confirmModal || !modelToDeleteSpan) {
    console.error('Modal elements not found');
    return;
  }

  // Update modal content
  modelToDeleteSpan.textContent = modelName;
  confirmModal.classList.remove('hidden');

  // Return a promise that resolves when the user makes a choice
  return new Promise<void>((resolve, reject) => {
    const handleConfirm = async () => {
      try {
        console.log('Starting deletion process...');
        modelTableBody!.innerHTML = '<tr><td colspan="5" class="loading">Deleting model(s)...</td></tr>';
        await deleteModel(modelName);
        console.log('Model(s) deleted successfully');
        await updateModelList();
        resolve();
      } catch (error) {
        console.error('Error deleting model(s):', error);
        alert(`Failed to delete model(s): ${error}`);
        await updateModelList();
        reject(error);
      } finally {
        cleanup();
      }
    };

    const handleCancel = () => {
      console.log('Deletion cancelled');
      cleanup();
      resolve();
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (event.target === confirmModal) {
        handleCancel();
      }
    };

    const cleanup = () => {
      confirmModal.classList.add('hidden');
      document.getElementById('confirm-delete')?.removeEventListener('click', handleConfirm);
      document.getElementById('cancel-delete')?.removeEventListener('click', handleCancel);
      confirmModal.removeEventListener('click', handleOutsideClick);
    };

    // Add event listeners
    document.getElementById('confirm-delete')?.addEventListener('click', handleConfirm);
    document.getElementById('cancel-delete')?.addEventListener('click', handleCancel);
    confirmModal.addEventListener('click', handleOutsideClick);
  });
}

function isDeletedModel(model: ModelUsage): boolean {
  return model.name.endsWith('-deleted');
}

function renderModels() {
  console.log('Rendering models...');
  if (!modelTableBody) {
    console.error('Model table body not found during render');
    return;
  }

  if (currentModels.length === 0) {
    console.log('No models to display');
    modelTableBody.innerHTML = '<tr><td colspan="5" class="loading">No models found</td></tr>';
    return;
  }

  console.log('Sorting models...');
  const sortedModels = sortModels(currentModels, currentSort.column, currentSort.direction);
  console.log('Sorted models:', sortedModels);

  modelTableBody.innerHTML = sortedModels.map(model => `
    <tr data-deleted="${isDeletedModel(model)}" data-unused="${model.usage_count === 0}">
      <td>${model.name}</td>
      <td>${model.last_used && Date.parse(model.last_used) > Date.parse('2020-01-01T00:00:00')
            ? formatDate(model.last_used)
            : 'No Logs'}</td>
      <td>${model.usage_count || 'No Logs'}</td>
      <td>${formatBytes(model.size)}</td>
      <td>
        <button class="delete-btn" data-model="${model.name}">Delete</button>
      </td>
    </tr>
  `).join('');

  console.log('Models rendered');
}

async function findUnusedModels() {
  try {
    const unusedModels = await listUnusedModels();

    if (unusedModels.length === 0) {
      alert('No unused models found.');
      return;
    }

    // Confirm deletion of unused models
    const confirmDelete = confirm(
      `Found ${unusedModels.length} unused model(s):\n\n` +
      unusedModels.join('\n') +
      '\n\nDo you want to delete these unused models?'
    );

    if (confirmDelete) {
      await deleteModel(unusedModels);
      await updateModelList();
    }
  } catch (error) {
    console.error('Error finding unused models:', error);
    alert(`Failed to find unused models: ${error}`);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  console.log('DOM loaded, initializing...');

  modelTableBody = document.querySelector("#model-list");
  if (!modelTableBody) {
    console.error("Could not find #model-list element");
    return;
  }
  console.log('Found model table body');

  // Add click handlers for sorting
  const sortHeaders = document.querySelectorAll('th[data-sort]');
  console.log('Found sort headers:', sortHeaders.length);
  sortHeaders.forEach(th => {
    th.addEventListener('click', () => {
      const column = th.getAttribute('data-sort') as SortColumn;
      if (column) {
        console.log('Sort header clicked:', column);
        handleSort(column);
      }
    });
  });

  // Add click handler for refresh button
  const refreshBtn = document.querySelector("#refresh-btn");
  if (refreshBtn) {
    console.log('Found refresh button');
    refreshBtn.addEventListener("click", () => {
      console.log('Refresh button clicked');
      updateModelList();
    });
  } else {
    console.error("Could not find #refresh-btn element");
  }

  // Add click handler for finding unused models
  const findUnusedBtn = document.querySelector("#find-unused-btn");
  if (findUnusedBtn) {
    console.log('Found find unused models button');
    findUnusedBtn.addEventListener("click", () => {
      console.log('Find unused models button clicked');
      findUnusedModels();
    });
  } else {
    console.error("Could not find #find-unused-btn element");
  }

  // Add click handler for delete buttons using event delegation
  modelTableBody.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    console.log('Table body clicked, target:', target);
    if (target.classList.contains('delete-btn')) {
      console.log('Delete button clicked');
      const modelName = target.getAttribute('data-model');
      console.log('Model name from button:', modelName);
      if (modelName) {
        await handleDelete(modelName);
      } else {
        console.error('No model name found on delete button');
      }
    }
  });

  // Initial load
  console.log('Starting initial load');
  updateModelList();
});
