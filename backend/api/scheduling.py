from datetime import datetime
from typing import List, Optional
from backend.os_engine.metrics import save_system_metrics
from backend.ai_engine.recommendation import recommend_algorithm
from backend.ai_engine.comparison import compare_algorithms
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, model_validator

from backend.os_engine.process import Process
from backend.os_engine.scheduler import get_scheduler
from backend.os_engine.os_database import (
    create_query,
    create_process,
    update_process_result,
    save_scheduling_result
)


router = APIRouter(
    prefix="/schedule",
    tags=["Scheduling"]
)


class ProcessInput(BaseModel):
    process_id: int = Field(ge=0)
    arrival_time: int = Field(ge=0)
    burst_time: int = Field(gt=0)
    priority: int = Field(default=0, ge=0)


class SchedulingRequest(BaseModel):
    query_text: str
    algorithm: str
    processes: List[ProcessInput]
    priority: int = 0
    time_quantum: Optional[int] = Field(default=None, gt=0)

    @model_validator(mode="after")
    def validate_unique_process_ids(self):
        process_ids = [process.process_id for process in self.processes]

        if len(process_ids) != len(set(process_ids)):
            raise ValueError("Process IDs must be unique.")

        return self
    
@router.post("/recommend")
def recommend_scheduling_algorithm(request: SchedulingRequest):
    try:
        process_data = [
            {
                "process_id": process.process_id,
                "arrival_time": process.arrival_time,
                "burst_time": process.burst_time,
                "priority": process.priority,
            }
            for process in request.processes
        ]

        recommendation = recommend_algorithm(process_data)

        return {
            "query_text": request.query_text,
            "recommendation": recommendation,
            "note": (
                "This is a rule-based recommendation. "
                "It does not automatically run the scheduler."
            ),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )

    
@router.post("/compare")
def compare_scheduling_algorithms(request: SchedulingRequest):
    try:
        processes = [
            Process(
                process_id=p.process_id,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority,
            )
            for p in request.processes
        ]

        comparison = compare_algorithms(
            processes,
            time_quantum=request.time_quantum or 2,
        )

        return {
            "query_text": request.query_text,
            "comparison": comparison,
            "note": (
                "Each algorithm was tested on a fresh copy "
                "of the same workload. Ties use algorithm-list order."
            ),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )



@router.post("/")
def schedule_processes(request: SchedulingRequest):

    try:

        algorithm = request.algorithm.upper()

        # --------------------------------
        # 1. Create query
        # --------------------------------

        query_id = create_query(
            query_text=request.query_text,
            algorithm=algorithm,
            priority=request.priority
        )

        # --------------------------------
        # 2. Create Python processes
        # --------------------------------

        processes = [
            Process(
                process_id=p.process_id,
                arrival_time=p.arrival_time,
                burst_time=p.burst_time,
                priority=p.priority
            )
            for p in request.processes
        ]

        # --------------------------------
        # 3. Get scheduler
        # --------------------------------

        scheduler = get_scheduler(
            algorithm,
            request.time_quantum
        )

        # --------------------------------
        # 4. Create database processes
        # --------------------------------

        base_time = datetime.now()

        database_process_ids = {}

        for process in processes:

            database_id = create_process(
                query_id=query_id,
                process=process,
                base_time=base_time
            )

            database_process_ids[
                process.process_id
            ] = database_id

        # --------------------------------
        # 5. Run scheduler
        # --------------------------------

        results = scheduler.schedule(processes)

        # --------------------------------
        # 6. Save results
        # --------------------------------

        for process in results:

            database_id = database_process_ids[
                process.process_id
            ]

            update_process_result(
                database_process_id=database_id,
                process=process,
                base_time=base_time
            )

            save_scheduling_result(
                database_process_id=database_id,
                process=process,
                algorithm=algorithm,
                base_time=base_time
            )

        metrics = save_system_metrics(
            processes=results
        )

        # --------------------------------
        # 7. Return response
        # --------------------------------

        return {
            "query_id": query_id,
            "algorithm": algorithm,
            "results": [
                {
                    "process_id": process.process_id,
                    "arrival_time": process.arrival_time,
                    "burst_time": process.burst_time,
                    "priority": process.priority,
                    "start_time": process.start_time,
                    "completion_time": process.completion_time,
                    "waiting_time": process.waiting_time,
                    "turnaround_time": process.turnaround_time,
                    "response_time": process.response_time
                }
                for process in results
            ],
            "system_metrics": metrics
        }

    except ValueError as error:

        raise HTTPException(
            status_code=400,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )