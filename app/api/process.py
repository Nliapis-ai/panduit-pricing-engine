from fastapi import APIRouter

router = APIRouter(prefix='/process', tags=['process'])

@router.post('/run/{job_id}')
def run_job(job_id:str):
    return {'job_id': job_id, 'status': 'queued'}
