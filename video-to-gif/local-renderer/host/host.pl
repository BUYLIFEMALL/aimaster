#!/usr/bin/perl
# GIF 자동화 「내 PC 고속 변환」 로컬 렌더러 — 맥용 Native Messaging 연결 스크립트.
# 맥 기본 perl 5.34 + 기본 모듈(JSON::PP, MIME::Base64, File::Temp)만 사용한다(설치할 것 없음).
# 약속(윈도우 host.ps1과 같음): 4바이트 길이(리틀 엔디언) + UTF-8 JSON. 렌더러 → Chrome 한 메시지 1MB 제한이라 결과는 조각으로 보낸다.
# 보안: 명령 문자열을 받지 않는다. 정해진 값(가로폭·fps·색 수·구간)만 검사해 ffmpeg 인자를 스스로 만든다.
use strict;
use warnings;
use JSON::PP;
use MIME::Base64 qw(encode_base64 decode_base64);
use File::Temp qw(tempdir);
use File::Basename qw(dirname);
use POSIX qw(:sys_wait_h);

my $HOST_VERSION = "1.30";
my $CHUNK_BYTES  = 600 * 1024;    # base64로 약 800KB — JSON 포함 1MB 아래
my $json         = JSON::PP->new->utf8->canonical;
my $workdir      = tempdir("buylife-gif-XXXXXX", TMPDIR => 1, CLEANUP => 1);
my %jobs;                         # job => { path, fh, bytes }

binmode STDIN;
binmode STDOUT;
$| = 1;

sub send_msg {
    my ($obj) = @_;
    my $bytes = $json->encode($obj);
    print STDOUT pack("V", length $bytes), $bytes;
}

sub read_exact {
    my ($n) = @_;
    my $buf = "";
    while (length $buf < $n) {
        my $got = read(STDIN, $buf, $n - length $buf, length $buf);
        return undef unless $got;    # Chrome이 연결을 닫음
    }
    return $buf;
}

sub find_ffmpeg {
    my $config = dirname(__FILE__) . "/config.json";
    if (open my $fh, "<", $config) {
        local $/;
        my $cfg = eval { $json->decode(<$fh>) } || {};
        return $cfg->{ffmpeg} if $cfg->{ffmpeg} && -x $cfg->{ffmpeg};
    }
    # Chrome이 렌더러를 실행할 때 PATH가 짧으므로 흔한 위치를 직접 본다.
    for my $p ("/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "$ENV{HOME}/Library/Application Support/BuylifeGifRenderer/ffmpeg") {
        return $p if -x $p;
    }
    return undef;
}

sub ffmpeg_version {
    my ($ffmpeg) = @_;
    return undef unless $ffmpeg;
    my $line = `"$ffmpeg" -hide_banner -version 2>/dev/null | head -1`;
    chomp $line;
    return $line;
}

sub safe_job {
    my ($job) = @_;
    return defined $job && $job =~ /\A[A-Za-z0-9_-]{1,64}\z/ ? $job : undef;
}

sub num_in {
    my ($v, $min, $max) = @_;
    return defined $v && $v =~ /\A\d+(?:\.\d+)?\z/ && $v >= $min && $v <= $max;
}

sub fail {
    my ($msg, %extra) = @_;
    send_msg({ type => "error", message => $msg, %extra });
}

sub do_encode {
    my ($m) = @_;
    my $job = safe_job($m->{job});
    my $req = defined $m->{req} && $m->{req} =~ /\A\d{1,9}\z/ ? $m->{req} + 0 : 0;
    my %ids = (job => $job, req => $req);
    return fail("job unknown", %ids) unless $job && $jobs{$job} && !$jobs{$job}{fh};
    return fail("bad params", %ids)
      unless num_in($m->{width}, 16, 4096) && $m->{width} == int($m->{width})
      && num_in($m->{fps}, 1, 60) && $m->{fps} == int($m->{fps})
      && num_in($m->{colors}, 2, 256) && $m->{colors} == int($m->{colors})
      && (!defined $m->{start} || num_in($m->{start}, 0, 36000))
      && (!defined $m->{duration} || num_in($m->{duration}, 0.05, 36000));

    my $ffmpeg = find_ffmpeg() or return fail("ffmpeg not found", %ids, code => "NO_FFMPEG");
    my $out    = "$workdir/$job-$req.gif";
    my $errlog = "$workdir/$job-$req.log";
    my @trim;
    push @trim, "-ss", "$m->{start}"    if defined $m->{start} && $m->{start} > 0;
    push @trim, "-t",  "$m->{duration}" if defined $m->{duration};
    my $filter = "fps=$m->{fps},scale=$m->{width}:-1:flags=lanczos,split[a][b];"
      . "[a]palettegen=max_colors=$m->{colors}:stats_mode=diff[p];"
      . "[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle";
    my @cmd = ($ffmpeg, "-hide_banner", "-nostdin", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y",
               @trim, "-i", $jobs{$job}{path}, "-lavfi", $filter, $out);

    pipe(my $r, my $w) or return fail("pipe failed", %ids);
    my $pid = fork();
    return fail("fork failed", %ids) unless defined $pid;
    if ($pid == 0) {
        close $r;
        open STDOUT, ">&", $w;
        open STDERR, ">", $errlog;
        open STDIN, "<", "/dev/null";
        exec { $cmd[0] } @cmd;
        exit 127;
    }
    close $w;
    my $total = defined $m->{duration} ? $m->{duration} : 0;
    my $last  = -1;
    while (my $line = <$r>) {
        next unless $total > 0 && $line =~ /\Aout_time_us=(\d+)/;
        my $pct = int(100 * ($1 / 1_000_000) / $total);
        $pct = 99 if $pct > 99;
        if ($pct > $last) {
            $last = $pct;
            send_msg({ type => "progress", %ids, ratio => $pct / 100 });
        }
    }
    close $r;
    waitpid($pid, 0);
    my $code = $? >> 8;
    if ($code != 0 || !-s $out) {
        my $err = "";
        if (open my $eh, "<", $errlog) { local $/; $err = <$eh> // ""; }
        unlink $out, $errlog;
        return fail("ffmpeg failed ($code): " . substr($err, -400), %ids);
    }
    open my $oh, "<:raw", $out or return fail("read failed", %ids);
    my $size   = -s $out;
    my $chunks = int(($size + $CHUNK_BYTES - 1) / $CHUNK_BYTES);
    send_msg({ type => "result", %ids, size => $size, chunks => $chunks });
    for my $seq (0 .. $chunks - 1) {
        read($oh, my $buf, $CHUNK_BYTES);
        # 큰 문자열은 JSON::PP를 거치지 않고 직접 만든다(base64에는 따옴표·역슬래시가 없음).
        my $msg = sprintf('{"type":"result-chunk","job":"%s","req":%d,"seq":%d,"data":"%s"}', $job, $req, $seq, encode_base64($buf, ""));
        print STDOUT pack("V", length $msg), $msg;
    }
    close $oh;
    unlink $out, $errlog;
    send_msg({ type => "result-end", %ids });
}

# v1.10 「audio」 명령(AIMaster 음악 프로그램): 형식 변환 + 선택 음량 맞춤(loudnorm 2번 방식: 측정 → 측정값으로 적용).
# 정해진 낱말·숫자만 쓴다: format mp3|aac|flac|wav, bitrate 96~320kbps, sampleRate 44100|48000,
# lufs 6~30(목표 -lufs LUFS), tp 0~3(최대 -tp dBTP), duration(진행률 표시용).
my %AUDIO_FORMATS = (mp3 => ["libmp3lame", "mp3", 1], aac => ["aac", "m4a", 1], flac => ["flac", "flac", 0], wav => ["pcm_s24le", "wav", 0]);

sub run_ff {
    my ($cmd, $total, $ids, $from, $span, $errlog) = @_;
    pipe(my $r, my $w) or return (-1, "pipe failed");
    my $pid = fork();
    return (-1, "fork failed") unless defined $pid;
    if ($pid == 0) {
        close $r;
        open STDOUT, ">&", $w;
        open STDERR, ">", $errlog;
        open STDIN, "<", "/dev/null";
        exec { $cmd->[0] } @$cmd;
        exit 127;
    }
    close $w;
    my $last = -1;
    while (my $line = <$r>) {
        next unless $total > 0 && $line =~ /\Aout_time_us=(\d+)/;
        my $ratio = ($1 / 1_000_000) / $total;
        $ratio = 1 if $ratio > 1;
        my $pct = int(100 * ($from + $span * $ratio));
        $pct = 99 if $pct > 99;
        if ($pct > $last) { $last = $pct; send_msg({ type => "progress", %$ids, ratio => $pct / 100 }); }
    }
    close $r;
    waitpid($pid, 0);
    my $code = $? >> 8;
    my $err = "";
    if (open my $eh, "<", $errlog) { local $/; $err = <$eh> // ""; }
    unlink $errlog;
    return ($code, $err);
}

sub loud_json {
    my ($text) = @_;
    my @all = $text =~ /(\{[^{}]*"input_i"[^{}]*\})/g;
    return undef unless @all;
    return eval { JSON::PP->new->decode($all[-1]) };
}

sub do_audio {
    my ($m) = @_;
    my $job = safe_job($m->{job});
    my $req = defined $m->{req} && $m->{req} =~ /\A\d{1,9}\z/ ? $m->{req} + 0 : 0;
    my %ids = (job => $job, req => $req);
    return fail("job unknown", %ids) unless $job && $jobs{$job} && !$jobs{$job}{fh};
    my $fmt = defined $m->{format} && !ref $m->{format} ? $m->{format} : "";
    my $f = $AUDIO_FORMATS{$fmt};
    return fail("bad params", %ids)
      unless $f
      && defined $m->{sampleRate} && ($m->{sampleRate} =~ /\A(?:44100|48000)\z/)
      && (!$f->[2] || (num_in($m->{bitrate}, 96, 320) && $m->{bitrate} == int($m->{bitrate})))
      && (!defined $m->{lufs} || num_in($m->{lufs}, 6, 30))
      && (!defined $m->{tp} || num_in($m->{tp}, 0, 3))
      && (!defined $m->{duration} || num_in($m->{duration}, 0.05, 36000));

    my $ffmpeg = find_ffmpeg() or return fail("ffmpeg not found", %ids, code => "NO_FFMPEG");
    my $total = defined $m->{duration} ? $m->{duration} : 0;
    my $in    = $jobs{$job}{path};
    my $norm  = defined $m->{lufs};
    my $I     = $norm ? "-$m->{lufs}" : "-14";
    my $TP    = defined $m->{tp} ? "-$m->{tp}" : "-1";
    my @base  = ($ffmpeg, "-hide_banner", "-nostdin", "-nostats", "-progress", "pipe:1", "-y");
    my $errlog = "$workdir/$job-$req.log";

    # 1번: 측정(항상 — 입력 음량을 알려 준다)
    my ($c1, $e1) = run_ff([@base, "-i", $in, "-af", "loudnorm=I=$I:TP=$TP:LRA=11:print_format=json", "-f", "null", "-"], $total, \%ids, 0, 0.4, $errlog);
    my $meas = loud_json($e1);
    return fail("ffmpeg measure failed ($c1): " . substr($e1, -400), %ids) if $c1 != 0 || !$meas;

    # 2번: 저장(음량 맞춤을 고르면 측정값으로 직선 맞춤)
    my $out = "$workdir/$job-$req.$f->[1]";
    my @cmd = (@base, "-i", $in, "-vn", "-map_metadata", "-1");
    if ($norm) {
        push @cmd, "-af", "loudnorm=I=$I:TP=$TP:LRA=11:measured_I=$meas->{input_i}:measured_TP=$meas->{input_tp}"
          . ":measured_LRA=$meas->{input_lra}:measured_thresh=$meas->{input_thresh}:offset=$meas->{target_offset}:linear=true:print_format=json";
    }
    push @cmd, "-ar", int($m->{sampleRate}), "-c:a", $f->[0];
    push @cmd, "-b:a", int($m->{bitrate}) . "k" if $f->[2];
    push @cmd, $out;
    my ($c2, $e2) = run_ff(\@cmd, $total, \%ids, 0.4, 0.6, $errlog);
    if ($c2 != 0 || !-s $out) { unlink $out; return fail("ffmpeg failed ($c2): " . substr($e2, -400), %ids); }
    my $after = $norm ? loud_json($e2) : undef;

    open my $oh, "<:raw", $out or return fail("read failed", %ids);
    my $size   = -s $out;
    my $chunks = int(($size + $CHUNK_BYTES - 1) / $CHUNK_BYTES);
    my %res = (type => "result", %ids, size => $size, chunks => $chunks, ext => $f->[1],
               inputI => "$meas->{input_i}", inputTP => "$meas->{input_tp}", inputLRA => "$meas->{input_lra}");
    if ($after) { $res{outputI} = "$after->{output_i}"; $res{outputTP} = "$after->{output_tp}"; $res{outputLRA} = "$after->{output_lra}"; }
    send_msg(\%res);
    for my $seq (0 .. $chunks - 1) {
        read($oh, my $buf, $CHUNK_BYTES);
        my $msg = sprintf('{"type":"result-chunk","job":"%s","req":%d,"seq":%d,"data":"%s"}', $job, $req, $seq, encode_base64($buf, ""));
        print STDOUT pack("V", length $msg), $msg;
    }
    close $oh;
    unlink $out;
    send_msg({ type => "result-end", %ids });
}


# v1.20 「loop」 명령(AIMaster 영상 프로그램, 무한 루프 영상): 끊김 없는 루프 1회분 + 반복.
# 무한 루프 영상 src/lib/loop/plan.ts normalize()·buildFilter()·encodeArgs()와 같은 규칙 — 함께 맞출 것(윈도우 host.ps1도 같음).
# 정해진 낱말·숫자만: mode smart|overlap|bounce, format mp4|webm|gif, start·end 0~36000초, crossfade 0~2초,
# repeat 1~200, duration(원본 길이) 0.1~36000초. 소리 트랙은 여기서 ffmpeg -i 기록으로 직접 확인한다.
sub clampf { my ($v, $lo, $hi) = @_; return $v < $lo ? $lo : $v > $hi ? $hi : $v; }
sub f3 { return sprintf("%.3f", $_[0]); }

sub send_file {
    my ($out, $ids, %extra) = @_;
    open my $oh, "<:raw", $out or return fail("read failed", %$ids);
    my $size   = -s $out;
    my $chunks = int(($size + $CHUNK_BYTES - 1) / $CHUNK_BYTES);
    send_msg({ type => "result", %$ids, size => $size, chunks => $chunks, %extra });
    for my $seq (0 .. $chunks - 1) {
        read($oh, my $buf, $CHUNK_BYTES);
        my $msg = sprintf('{"type":"result-chunk","job":"%s","req":%d,"seq":%d,"data":"%s"}', $ids->{job}, $ids->{req}, $seq, encode_base64($buf, ""));
        print STDOUT pack("V", length $msg), $msg;
    }
    close $oh;
    unlink $out;
    send_msg({ type => "result-end", %$ids });
}

sub do_loop {
    my ($m) = @_;
    my $job = safe_job($m->{job});
    my $req = defined $m->{req} && $m->{req} =~ /\A\d{1,9}\z/ ? $m->{req} + 0 : 0;
    my %ids = (job => $job, req => $req);
    return fail("job unknown", %ids) unless $job && $jobs{$job} && !$jobs{$job}{fh};
    my $mode = defined $m->{mode} && !ref $m->{mode} ? $m->{mode} : "";
    my $fmt  = defined $m->{format} && !ref $m->{format} ? $m->{format} : "";
    return fail("bad params", %ids)
      unless $mode =~ /\A(?:smart|overlap|bounce)\z/ && $fmt =~ /\A(?:mp4|webm|gif)\z/
      && num_in($m->{start}, 0, 36000) && num_in($m->{end}, 0, 36000) && num_in($m->{crossfade}, 0, 2)
      && num_in($m->{repeat}, 1, 200) && $m->{repeat} == int($m->{repeat}) && num_in($m->{duration}, 0.1, 36000);
    my $ffmpeg = find_ffmpeg() or return fail("ffmpeg not found", %ids, code => "NO_FFMPEG");

    # normalize (plan.ts)
    my $dur = $m->{duration} > 0.1 ? $m->{duration} + 0 : 0.1;
    my $s = clampf($m->{start} + 0, 0, $dur);
    my $e = clampf($m->{end} + 0, 0, $dur);
    if ($mode eq "overlap") { $s = 0; $e = $dur; }
    $e = ($s + 0.1 < $dur ? $s + 0.1 : $dur) if $e - $s < 0.1;
    $s = ($e - 0.1 > 0 ? $e - 0.1 : 0) if $e - $s < 0.1;
    my $len = $e - $s;
    my $cf = $mode eq "overlap" ? 1 : clampf($m->{crossfade} + 0, 0.1, 2);
    $cf = 0 if $mode eq "bounce";
    my $cap = $len / 2 - 0.01; $cap = 0 if $cap < 0;
    $cf = $cap if $cf > $cap;
    $cf = sprintf("%.3f", $cf) + 0;
    my $repeat = int($m->{repeat});
    my $unit_len = $mode eq "bounce" ? $len * 2 : $len - $cf;

    # 소리 트랙(크롬은 화면에서 알 수 없어 파일에서 직접 읽는다)
    my $in = $jobs{$job}{path};
    my $errlog = "$workdir/$job-$req.log";
    my (undef, $probe) = run_ff([$ffmpeg, "-hide_banner", "-nostdin", "-i", $in], 0, \%ids, 0, 0, $errlog);
    my $has_audio = $fmt ne "gif" && $probe =~ /Stream #\d+:\d+(?:\[[^\]\n]*\])?(?:\([^)\n]*\))?: Audio:/ ? 1 : 0;

    # 필터 (plan.ts buildFilter)
    my ($S, $E, $CF) = (f3($s), f3($e), f3($cf));
    my @map = ("-map", "[vout]");
    my $fl;
    if ($mode eq "bounce") {
        $fl = "[0:v]trim=$S:$E,setpts=PTS-STARTPTS,split[v1][v2];[v2]reverse[vr];[v1][vr]concat=n=2:v=1:a=0[vout]";
        if ($has_audio) { $fl .= ";[0:a]atrim=$S:$E,asetpts=PTS-STARTPTS,asplit[a1][a2];[a2]areverse[ar];[a1][ar]concat=n=2:v=0:a=1[aout]"; push @map, "-map", "[aout]"; }
    } elsif ($cf <= 0) {
        $fl = "[0:v]trim=$S:$E,setpts=PTS-STARTPTS[vout]";
        if ($has_audio) { $fl .= ";[0:a]atrim=$S:$E,asetpts=PTS-STARTPTS[aout]"; push @map, "-map", "[aout]"; }
    } else {
        my $mid = $e - $s - 2 * $cf;
        my ($T0, $H1) = (f3($e - $cf), f3($s + $cf));
        my @parts = ("[0:v]trim=$T0:$E,setpts=PTS-STARTPTS[tail]", "[0:v]trim=$S:$H1,setpts=PTS-STARTPTS[head]", "[tail][head]xfade=transition=fade:duration=$CF:offset=0[blend]");
        my ($vcat, $vn) = ("[blend]", 1);
        if ($mid > 0.001) { push @parts, "[0:v]trim=$H1:$T0,setpts=PTS-STARTPTS[mid]"; ($vcat, $vn) = ("[blend][mid]", 2); }
        push @parts, "${vcat}concat=n=$vn:v=1:a=0[vout]";
        if ($has_audio) {
            push @parts, "[0:a]atrim=$T0:$E,asetpts=PTS-STARTPTS[atail]", "[0:a]atrim=$S:$H1,asetpts=PTS-STARTPTS[ahead]", "[atail][ahead]acrossfade=d=$CF\[ablend]";
            my ($acat, $an) = ("[ablend]", 1);
            if ($mid > 0.001) { push @parts, "[0:a]atrim=$H1:$T0,asetpts=PTS-STARTPTS[amid]"; ($acat, $an) = ("[ablend][amid]", 2); }
            push @parts, "${acat}concat=n=$an:v=0:a=1[aout]";
            push @map, "-map", "[aout]";
        }
        $fl = join(";", @parts);
    }

    # 인코딩 (plan.ts encodeArgs) — GIF는 mp4 1회분을 먼저 만든다
    my $unit_ext = $fmt eq "webm" ? "webm" : "mp4";
    my $aud = $has_audio && $fmt ne "gif";
    my @enc = $unit_ext eq "webm"
      ? ("-c:v", "libvpx", "-b:v", "2M", "-crf", "10", $aud ? ("-c:a", "libvorbis") : ("-an"))
      : ("-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", $aud ? ("-c:a", "aac", "-b:a", "128k") : ("-an"));
    my @base = ($ffmpeg, "-hide_banner", "-nostdin", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y");
    my $unit = "$workdir/$job-$req-unit.$unit_ext";
    my $span1 = $fmt eq "gif" ? 0.7 : $repeat > 1 ? 0.9 : 1;
    my ($c1, $e1) = run_ff([@base, "-i", $in, "-filter_complex", $fl, @map, @enc, $unit], $unit_len, \%ids, 0, $span1, $errlog);
    if ($c1 != 0 || !-s $unit) { unlink $unit; return fail("ffmpeg loop failed ($c1): " . substr($e1, -400), %ids); }
    my $out = $unit;
    if ($fmt eq "gif") {
        $out = "$workdir/$job-$req.gif";
        my ($c2) = run_ff([@base, "-i", $unit, "-vf", "fps=15,scale='min(480,iw)':-2:flags=lanczos,split[a][b];[a]palettegen[pl];[b][pl]paletteuse", "-loop", "0", $out], $unit_len, \%ids, 0.7, 0.3, $errlog);
        unlink $unit;
        if ($c2 != 0 || !-s $out) { unlink $out; return fail("ffmpeg gif failed ($c2)", %ids); }
    } elsif ($repeat > 1) {
        $out = "$workdir/$job-$req.$unit_ext";
        my ($c2) = run_ff([@base, "-stream_loop", $repeat - 1, "-i", $unit, "-c", "copy", $out], 0, \%ids, 0.9, 0.1, $errlog);
        unlink $unit;
        if ($c2 != 0 || !-s $out) { unlink $out; return fail("ffmpeg repeat failed ($c2)", %ids); }
    }
    send_file($out, \%ids, ext => ($fmt eq "gif" ? "gif" : $unit_ext), hasAudio => ($aud ? JSON::PP::true : JSON::PP::false),
              unitSeconds => sprintf("%.3f", $unit_len) + 0, filter => $fl);
}


# v1.30 「normalize」·「compress」 명령(AIMaster 영상 프로그램, AI 영상 스튜디오 영상 합치기) — 윈도우 host.ps1과 같은 규칙.
# normalize: H.264 yuv420p·고정 fps·짝수 크기·긴 변 maxSide 이하, 소리가 있으면 AAC 48k 스테레오, faststart.
#   값: fps 24~60(정수), maxSide 360~3840(정수), duration 0.05~36000(진행률용, 생략 가능).
# compress: 품질 낱말 high|balanced|small(crf 20/23/27)로 H.264 다시 인코딩, maxSide 360~3840(생략 가능), 소리 있으면 AAC 128k, faststart.
sub has_audio_in {
    my ($ffmpeg, $in, $ids, $errlog) = @_;
    my (undef, $probe) = run_ff([$ffmpeg, "-hide_banner", "-nostdin", "-i", $in], 0, $ids, 0, 0, $errlog);
    return $probe =~ /Stream #\d+:\d+(?:\[[^\]\n]*\])?(?:\([^)\n]*\))?: Audio:/ ? 1 : 0;
}
sub scale_filter {
    my ($max) = @_;
    return "scale='if(gt(iw,ih),trunc(min($max,iw)/2)*2,-2)':'if(gt(iw,ih),-2,trunc(min($max,ih)/2)*2)':flags=lanczos,setsar=1";
}
sub video_job_ids {
    my ($m) = @_;
    my $job = safe_job($m->{job});
    my $req = defined $m->{req} && $m->{req} =~ /\A\d{1,9}\z/ ? $m->{req} + 0 : 0;
    return ($job, (job => $job, req => $req));
}

sub do_normalize {
    my ($m) = @_;
    my ($job, %ids) = video_job_ids($m);
    return fail("job unknown", %ids) unless $job && $jobs{$job} && !$jobs{$job}{fh};
    return fail("bad params", %ids)
      unless num_in($m->{fps}, 24, 60) && $m->{fps} == int($m->{fps})
      && num_in($m->{maxSide}, 360, 3840) && $m->{maxSide} == int($m->{maxSide})
      && (!defined $m->{duration} || num_in($m->{duration}, 0.05, 36000));
    my $ffmpeg = find_ffmpeg() or return fail("ffmpeg not found", %ids, code => "NO_FFMPEG");
    my $in = $jobs{$job}{path};
    my $req = $ids{req};
    my $errlog = "$workdir/$job-$req.log";
    my $aud = has_audio_in($ffmpeg, $in, \%ids, $errlog);
    my $fps = int($m->{fps});
    my $vf = "fps=$fps," . scale_filter(int($m->{maxSide})) . ",format=yuv420p";
    my $total = defined $m->{duration} ? $m->{duration} + 0 : 0;
    my $out = "$workdir/$job-$req-norm.mp4";
    my @cmd = ($ffmpeg, "-hide_banner", "-nostdin", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y", "-i", $in, "-map", "0:v:0",
               ($aud ? ("-map", "0:a:0") : ()),
               "-vf", $vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-g", $fps * 2,
               ($aud ? ("-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2") : ("-an")),
               "-movflags", "+faststart", $out);
    my ($c, $e) = run_ff(\@cmd, $total, \%ids, 0, 1, $errlog);
    if ($c != 0 || !-s $out) { unlink $out; return fail("ffmpeg normalize failed ($c): " . substr($e, -400), %ids); }
    send_file($out, \%ids, ext => "mp4", hasAudio => ($aud ? JSON::PP::true : JSON::PP::false));
}

sub do_compress {
    my ($m) = @_;
    my ($job, %ids) = video_job_ids($m);
    return fail("job unknown", %ids) unless $job && $jobs{$job} && !$jobs{$job}{fh};
    my %crfs = (high => 20, balanced => 23, small => 27);
    my $q = defined $m->{quality} && !ref $m->{quality} ? $m->{quality} : "";
    return fail("bad params", %ids)
      unless exists $crfs{$q}
      && (!defined $m->{maxSide} || (num_in($m->{maxSide}, 360, 3840) && $m->{maxSide} == int($m->{maxSide})))
      && (!defined $m->{duration} || num_in($m->{duration}, 0.05, 36000));
    my $ffmpeg = find_ffmpeg() or return fail("ffmpeg not found", %ids, code => "NO_FFMPEG");
    my $in = $jobs{$job}{path};
    my $in_size = -s $in;
    my $req = $ids{req};
    my $errlog = "$workdir/$job-$req.log";
    my $aud = has_audio_in($ffmpeg, $in, \%ids, $errlog);
    my $vf = defined $m->{maxSide} ? scale_filter(int($m->{maxSide})) . ",format=yuv420p" : "format=yuv420p";
    my $total = defined $m->{duration} ? $m->{duration} + 0 : 0;
    my $out = "$workdir/$job-$req-small.mp4";
    my @cmd = ($ffmpeg, "-hide_banner", "-nostdin", "-loglevel", "error", "-nostats", "-progress", "pipe:1", "-y", "-i", $in, "-map", "0:v:0",
               ($aud ? ("-map", "0:a:0") : ()),
               "-vf", $vf, "-c:v", "libx264", "-preset", "medium", "-crf", $crfs{$q}, "-pix_fmt", "yuv420p",
               ($aud ? ("-c:a", "aac", "-b:a", "128k") : ("-an")),
               "-movflags", "+faststart", $out);
    my ($c, $e) = run_ff(\@cmd, $total, \%ids, 0, 1, $errlog);
    if ($c != 0 || !-s $out) { unlink $out; return fail("ffmpeg compress failed ($c): " . substr($e, -400), %ids); }
    send_file($out, \%ids, ext => "mp4", hasAudio => ($aud ? JSON::PP::true : JSON::PP::false), inSize => $in_size + 0);
}

while (defined(my $head = read_exact(4))) {
    my $len  = unpack("V", $head);
    my $body = read_exact($len);
    last unless defined $body;
    # 조각 메시지(약 700KB)는 순수 perl JSON::PP 해석이 느려(20MB에 16초) 정규식으로 바로 꺼낸다.
    if ($body =~ /"type"\s*:\s*"chunk"/) {
        my ($job)  = $body =~ /"job"\s*:\s*"([A-Za-z0-9_-]{1,64})"/;
        my ($seq)  = $body =~ /"seq"\s*:\s*(\d{1,9})/;
        my ($data) = $body =~ /"data"\s*:\s*"([A-Za-z0-9+\/=]*)"/;
        my $j = $job && $jobs{$job};
        if (!$j || !$j->{fh} || !defined $data) { fail("job not open", job => $job); next; }
        my $raw = decode_base64($data);
        print { $j->{fh} } $raw;
        $j->{bytes} += length $raw;
        send_msg({ type => "chunk-ok", job => $job, seq => defined $seq ? $seq + 0 : undef });
        next;
    }
    my $m = eval { $json->decode($body) };
    if (!$m || ref $m ne "HASH") { fail("bad message"); next; }
    my $type = $m->{type} // "";

    if ($type eq "ping") {
        my $ffmpeg = find_ffmpeg();
        send_msg({ type => "pong", host => "perl", hostVersion => $HOST_VERSION,
                   ffmpeg => $ffmpeg, ffmpegVersion => ffmpeg_version($ffmpeg), capabilities => ["gif", "audio", "loop", "normalize", "compress"] });
    } elsif ($type eq "begin") {
        my $job = safe_job($m->{job}) or do { fail("bad job"); next };
        my $path = "$workdir/$job.in";
        open my $fh, ">:raw", $path or do { fail("open failed", job => $job); next };
        $jobs{$job} = { path => $path, fh => $fh, bytes => 0 };
        send_msg({ type => "begin-ok", job => $job });
    } elsif ($type eq "chunk") {
        my $job = safe_job($m->{job});
        my $j = $job && $jobs{$job};
        if (!$j || !$j->{fh}) { fail("job not open", job => $job); next; }
        my $data = decode_base64($m->{data} // "");
        print { $j->{fh} } $data;
        $j->{bytes} += length $data;
        send_msg({ type => "chunk-ok", job => $job, seq => $m->{seq} });
    } elsif ($type eq "end") {
        my $job = safe_job($m->{job});
        my $j = $job && $jobs{$job};
        if (!$j || !$j->{fh}) { fail("job not open", job => $job); next; }
        close $j->{fh};
        delete $j->{fh};
        send_msg({ type => "end-ok", job => $job, bytes => $j->{bytes} });
    } elsif ($type eq "encode") {
        do_encode($m);
    } elsif ($type eq "audio") {
        do_audio($m);
    } elsif ($type eq "loop") {
        do_loop($m);
    } elsif ($type eq "normalize") {
        do_normalize($m);
    } elsif ($type eq "compress") {
        do_compress($m);
    } elsif ($type eq "release") {
        my $job = safe_job($m->{job});
        if ($job && $jobs{$job}) {
            close $jobs{$job}{fh} if $jobs{$job}{fh};
            unlink $jobs{$job}{path};
            delete $jobs{$job};
        }
        send_msg({ type => "release-ok", job => $job });
    } else {
        fail("unknown type");
    }
}
