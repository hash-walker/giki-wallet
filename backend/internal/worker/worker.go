package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/hash-walker/giki-wallet/internal/common"
	"github.com/hash-walker/giki-wallet/internal/mailer"
	"github.com/hash-walker/giki-wallet/internal/middleware"
	worker "github.com/hash-walker/giki-wallet/internal/worker/worker_db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type JobWorker struct {
	q      *worker.Queries
	dbPool *pgxpool.Pool
	mailer *mailer.GraphSender
}

func NewWorker(dbPool *pgxpool.Pool, mailer *mailer.GraphSender) *JobWorker {
	return &JobWorker{
		q:      worker.New(dbPool),
		dbPool: dbPool,
		mailer: mailer,
	}
}

func (w *JobWorker) Enqueue(ctx context.Context, jobType string, payload interface{}) error {
	return w.EnqueueIn(ctx, jobType, payload, 0)
}

func (w *JobWorker) EnqueueIn(ctx context.Context, jobType string, payload interface{}, delay time.Duration) error {
	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal job payload: %w", err)
	}

	runAt := time.Now().Add(delay)

	_, err = w.q.CreateJob(ctx, worker.CreateJobParams{
		JobType: jobType,
		Payload: jsonBytes,
		RunAt:   runAt,
	})

	if err != nil {
		return fmt.Errorf("failed to enqueue job: %w", err)
	}

	return nil
}

func (w *JobWorker) StartJobTicker(ctx context.Context, workerCount int) {
	for i := range workerCount {
		go func(workerID int) {
			time.Sleep(time.Duration(workerID*100) * time.Millisecond)
			ticker := time.NewTicker(200 * time.Millisecond)
			defer ticker.Stop()
			for {
				select {
				case <-ctx.Done():
					return
				case <-ticker.C:
					w.processNextJob(ctx)
				}
			}
		}(i)
	}
}

func (w *JobWorker) StartStatusTicker(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := w.q.AutoOpenTrips(ctx); err != nil {
				middleware.LogAppError(err, "Error opening trips")
			}

			if err := w.q.AutoCloseTrips(ctx); err != nil {
				middleware.LogAppError(err, "Error closing trips")
			}
		}
	}
}

func (w *JobWorker) processNextJob(ctx context.Context) {
	job, err := w.q.FetchNextJob(ctx)
	if err != nil {
		return
	}

	var processErr error

	switch job.JobType {
	case "SEND_STUDENT_VERIFY_EMAIL":
		processErr = w.handleStudentVerification(job.Payload)
	case "SEND_EMPLOYEE_WAIT_EMAIL":
		processErr = w.handleEmployeeWait(job.Payload)
	case "SEND_EMPLOYEE_APPROVED_EMAIL":
		processErr = w.handleEmployeeApproved(job.Payload)
	case "SEND_EMPLOYEE_REJECTED_EMAIL":
		processErr = w.handleEmployeeRejected(job.Payload)
	default:
		log.Printf("Unknown job type: %s", job.JobType)
		processErr = fmt.Errorf("unknown job type")
	}

	if processErr != nil {
		w.q.FailJob(ctx, worker.FailJobParams{
			ID:        job.ID,
			LastError: common.StringToText(processErr.Error()),
		})
	} else {
		w.q.CompleteJob(ctx, job.ID)
	}
}

func (w *JobWorker) handleStudentVerification(payload json.RawMessage) error {

	var data StudentVerifyPayload
	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}

	return w.mailer.SendTemplate(data.Email, "Verify your GIKI Account", "verify.html", data)
}

func (w *JobWorker) handleEmployeeWait(payload json.RawMessage) error {
	var data EmployeeWaitPayload

	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}

	return w.mailer.SendTemplate(data.Email, "Application Received", "pending.html", data)
}

func (w *JobWorker) handleEmployeeApproved(payload json.RawMessage) error {
	var data EmployeeApprovedPayload
	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}

	return w.mailer.SendTemplate(data.Email, "Account Approved!", "employee_approved.html", data)
}

func (w *JobWorker) handleEmployeeRejected(payload json.RawMessage) error {
	var data EmployeeWaitPayload
	if err := json.Unmarshal(payload, &data); err != nil {
		return err
	}

	return w.mailer.SendTemplate(data.Email, "Application Status", "rejected.html", data)
}
