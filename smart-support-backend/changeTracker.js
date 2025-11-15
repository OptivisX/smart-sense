/**
 * Change Tracker - Track all database changes with rollback capability
 * Ensures developer can review and revert bot-made changes if needed
 */

const dataService = require('./dataService');

class ChangeTracker {
  constructor() {
    // In-memory change history (in production, use actual database)
    this.changeHistory = [];
    this.changeIdCounter = 1;
  }

  /**
   * Record a change before it's applied
   */
  recordChange(changeData) {
    const change = {
      changeId: changeData.changeId || `CHG-${Date.now()}-${this.changeIdCounter++}`,
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...changeData
    };

    this.changeHistory.push(change);
    console.log(`📝 Change recorded: ${change.changeId}`);

    dataService.recordChange(change).catch(err => {
      console.error('Supabase recordChange sync failed:', err.message);
    });
    return change.changeId;
  }

  /**
   * Mark change as applied
   */
  markApplied(changeId) {
    const change = this.changeHistory.find(c => c.changeId === changeId);
    if (change) {
      change.status = 'applied';
      change.appliedAt = new Date().toISOString();
      dataService.updateChange(changeId, {
        status: 'applied',
        applied_at: change.appliedAt
      }).catch(err => console.error('Supabase markApplied sync failed:', err.message));
    }
  }

  /**
   * Mark change as rolled back
   */
  markRolledBack(changeId, reason) {
    const change = this.changeHistory.find(c => c.changeId === changeId);
    if (change) {
      change.status = 'rolled_back';
      change.rolledBackAt = new Date().toISOString();
      change.rollbackReason = reason;
      dataService.updateChange(changeId, {
        status: 'rolled_back',
        rolled_back_at: change.rolledBackAt,
        rollback_reason: reason
      }).catch(err => console.error('Supabase markRolledBack sync failed:', err.message));
    }
  }

  /**
   * Get change by ID
   */
  getChange(changeId) {
    return this.changeHistory.find(c => c.changeId === changeId);
  }

  /**
   * Get all changes for an entity
   */
  getChangesByEntity(entityType, entityId) {
    return this.changeHistory.filter(
      c => c.entityType === entityType && c.entityId === entityId
    );
  }

  /**
   * Get pending changes awaiting review
   */
  getPendingChanges() {
    return this.changeHistory.filter(c => c.status === 'pending');
  }

  /**
   * Get all changes with optional filters
   */
  getAllChanges(filters = {}) {
    let changes = [...this.changeHistory];

    if (filters.status) {
      changes = changes.filter(c => c.status === filters.status);
    }

    if (filters.entityType) {
      changes = changes.filter(c => c.entityType === filters.entityType);
    }

    if (filters.madeBy) {
      changes = changes.filter(c => c.madeBy === filters.madeBy);
    }

    // Sort by timestamp, newest first
    changes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return changes;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      total: this.changeHistory.length,
      pending: this.changeHistory.filter(c => c.status === 'pending').length,
      applied: this.changeHistory.filter(c => c.status === 'applied').length,
      rolledBack: this.changeHistory.filter(c => c.status === 'rolled_back').length,
      byBot: this.changeHistory.filter(c => c.madeBy === 'bot').length,
      byHuman: this.changeHistory.filter(c => c.madeBy === 'human').length
    };
  }
}

// Singleton instance
const changeTracker = new ChangeTracker();

module.exports = changeTracker;
